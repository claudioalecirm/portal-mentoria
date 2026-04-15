// api/asaas-webhook.js — v3
// Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_DECLINED, SUBSCRIPTION_DELETED
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)
const ASAAS_URL = process.env.ASAAS_API_KEY?.includes('hmlg')
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'
const MENTOR_ID = '00000000-0000-0000-0000-000000000001'
const PRODUTO_MENTORIA = {
  'governo-pessoal':  '10000000-0000-0000-0000-000000000001',
  'homem-espiritual': '10000000-0000-0000-0000-000000000002'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { event, payment, subscription } = req.body
  console.log('Asaas:', event)

  if (['PAYMENT_CONFIRMED','PAYMENT_RECEIVED'].includes(event) && payment) {
    await handleConfirmado(req, payment)
  } else if (['PAYMENT_OVERDUE','PAYMENT_DECLINED'].includes(event) && payment) {
    await handleNegado(payment, event)
  } else if (event === 'SUBSCRIPTION_DELETED' && subscription) {
    await supabase.from('assinaturas')
      .update({ status: 'cancelado', cancelado_em: new Date().toISOString() })
      .eq('asaas_subscription_id', subscription.id)
  }

  res.status(200).json({ ok: true })
}

async function handleConfirmado(req, payment) {
  const cli = await buscarCliente(payment.customer)
  if (!cli?.email) return
  const { nome, email, telefone } = cli
  const mentoriaId = identificarMentoria(payment)

  const { data: userExiste } = await supabase.from('usuarios').select('id').eq('email', email).single()
  let usuarioId = userExiste?.id

  if (!usuarioId) {
    const { data: u } = await supabase.from('usuarios')
      .insert({ nome, email, senha_hash: 'pendente', role: 'aluno', ativo: true })
      .select().single()
    usuarioId = u?.id
  }

  const { data: alunoExiste } = await supabase.from('alunos')
    .select('id, pagamento_status').eq('usuario_id', usuarioId).single()

  if (alunoExiste) {
    // Limpa aviso de negado
    if (alunoExiste.pagamento_status !== 'ok') {
      await supabase.from('alunos').update({ pagamento_status: 'ok', pagamento_aviso: null }).eq('id', alunoExiste.id)
    }
    // Atualiza parcela paga
    await supabase.from('parcelas').update({ paga: true })
      .eq('aluno_id', alunoExiste.id).eq('numero', payment.installmentNumber || 1)
    // Assinatura — verifica conclusão
    if (payment.subscription) {
      await supabase.rpc('increment_ciclos', { sub_id: payment.subscription })
      const { data: ass } = await supabase.from('assinaturas')
        .select('ciclos_pagos, total_ciclos, asaas_subscription_id')
        .eq('asaas_subscription_id', payment.subscription).single()
      if (ass && ass.ciclos_pagos >= ass.total_ciclos) {
        await fetch(`${ASAAS_URL}/subscriptions/${ass.asaas_subscription_id}`, {
          method: 'DELETE', headers: { 'access_token': process.env.ASAAS_API_KEY }
        }).catch(() => {})
        await supabase.from('assinaturas')
          .update({ status: 'encerrado', cancelado_em: new Date().toISOString() })
          .eq('asaas_subscription_id', ass.asaas_subscription_id)
        await pushMentor(`Mentoria concluída`, `${nome} · processo encerrado`, 'encerrado')
      }
    }
    // Nova mentoria para aluno existente
    if (mentoriaId) {
      const { data: proc } = await supabase.from('processos')
        .insert({ aluno_id: alunoExiste.id, mentoria_id: mentoriaId, status: 'ativo', progresso: 0 })
        .select().single()
      await criarEncontros(alunoExiste.id, proc.id, mentoriaId)
      await pushMentor('Aluno renovou / nova mentoria', `${nome} · ${mentoriaNome(mentoriaId)}`, 'renovacao')
    }
    return
  }

  // Novo aluno
  const token = crypto.randomBytes(32).toString('hex')
  const { data: novoAluno } = await supabase.from('alunos').insert({
    usuario_id: usuarioId, mentoria_id: mentoriaId, progresso: 0, acesso_ativo: true,
    telefone, pagamento_status: 'ok',
    forma_pagamento: payment.billingType === 'BOLETO' ? 'boleto' : payment.billingType === 'CREDIT_CARD' ? 'cartao' : 'pix',
    total_parcelas: payment.installmentCount || 1,
    onboarding_token: token, onboarding_concluido: false
  }).select().single()

  const { data: proc } = await supabase.from('processos')
    .insert({ aluno_id: novoAluno.id, mentoria_id: mentoriaId, status: 'ativo', progresso: 0 })
    .select().single()

  await criarEncontros(novoAluno.id, proc.id, mentoriaId)

  const { data: ferramentas } = await supabase.from('ferramentas').select('id, ativo_global')
  if (ferramentas?.length) {
    await supabase.from('ferramentas_aluno').insert(
      ferramentas.map(f => ({ aluno_id: novoAluno.id, ferramenta_id: f.id, habilitada: f.ativo_global }))
    )
  }

  // Parcelas
  const total = payment.installmentCount || 1
  await supabase.from('parcelas').insert(
    Array.from({ length: total }, (_, i) => ({
      aluno_id: novoAluno.id, numero: i + 1, valor: payment.value,
      paga: i === 0 && payment.billingType !== 'BOLETO',
      boleto_url: i === 0 ? (payment.bankSlipUrl || null) : null
    }))
  )

  // Registra assinatura
  if (payment.subscription) {
    await supabase.from('assinaturas').insert({
      aluno_id: novoAluno.id, processo_id: proc.id,
      asaas_subscription_id: payment.subscription,
      status: 'ativo', valor: payment.value,
      total_ciclos: payment.installmentCount || 3, ciclos_pagos: 1
    })
  }

  // Email onboarding
  const link = `${process.env.VITE_APP_URL || 'https://portal-mentoria.vercel.app'}/cadastro?token=${token}`
  const m = mentoriaNome(mentoriaId)
  await resend.emails.send({
    from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
    to: email,
    subject: `Bem-vindo à Mentoria ${m} — Complete seu cadastro`,
    html: emailOnboarding(nome, m, link)
  }).catch(() => {})

  await pushMentor('Novo aluno — pagamento confirmado', `${nome} · ${m}`, 'novo-aluno')
}

async function handleNegado(payment, event) {
  const cli = await buscarCliente(payment.customer)
  if (!cli?.email) return
  const { nome, email } = cli

  const { data: usuario } = await supabase.from('usuarios').select('id').eq('email', email).single()
  if (!usuario) return
  const { data: aluno } = await supabase.from('alunos').select('id').eq('usuario_id', usuario.id).single()
  if (!aluno) return

  const motivo = event === 'PAYMENT_OVERDUE' ? 'em atraso' : 'recusado pelo banco'
  const aviso = `Pagamento da parcela ${payment.installmentNumber || ''} foi ${motivo}. Regularize para continuar acessando.`

  await supabase.from('alunos')
    .update({ pagamento_status: 'negado', pagamento_aviso: aviso })
    .eq('id', aluno.id)

  await pushMentor(
    `⚠️ Pagamento ${motivo}`,
    `${nome} · Parcela ${payment.installmentNumber || ''} · R$ ${payment.value}`,
    'pagamento-negado'
  )

  await resend.emails.send({
    from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
    to: email,
    subject: 'Atenção: problema com seu pagamento',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f0ece4;border-radius:12px">
      <div style="font-family:Georgia,serif;font-size:22px;color:#c8a97a;margin-bottom:20px">Claudio Alecrim</div>
      <p style="font-size:15px;margin-bottom:12px">Olá, <strong>${nome}</strong>.</p>
      <div style="background:#1a0a0a;border:.5px solid rgba(196,90,90,.4);border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="font-size:14px;color:#f0ece4;margin:0">${aviso}</p>
      </div>
      <a href="${process.env.VITE_APP_URL || 'https://portal-mentoria.vercel.app'}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:12px;border-radius:8px;text-align:center;font-weight:500">Acessar o Portal →</a>
    </div>`
  }).catch(() => {})
}

async function buscarCliente(customerId) {
  try {
    const r = await fetch(`${ASAAS_URL}/customers/${customerId}`, {
      headers: { 'access_token': process.env.ASAAS_API_KEY }
    })
    const c = await r.json()
    return { nome: c.name || 'Aluno', email: c.email?.toLowerCase().trim(), telefone: c.mobilePhone || '' }
  } catch { return null }
}

function identificarMentoria(p) {
  if (PRODUTO_MENTORIA[p.externalReference]) return PRODUTO_MENTORIA[p.externalReference]
  const d = (p.description || '').toLowerCase()
  if (d.includes('governo pessoal')) return PRODUTO_MENTORIA['governo-pessoal']
  if (d.includes('homem espiritual')) return PRODUTO_MENTORIA['homem-espiritual']
  return null
}

function mentoriaNome(id) {
  if (id === '10000000-0000-0000-0000-000000000001') return 'Governo Pessoal'
  if (id === '10000000-0000-0000-0000-000000000002') return 'Homem Espiritual'
  return 'Mentoria'
}

async function criarEncontros(alunoId, processoId, mentoriaId) {
  if (!mentoriaId) return
  const { data: t } = await supabase.from('encontros_template')
    .select('numero, nome').eq('mentoria_id', mentoriaId).order('numero')
  if (t?.length) await supabase.from('encontros').insert(
    t.map((e, i) => ({ aluno_id: alunoId, processo_id: processoId, numero: e.numero, nome: e.nome, status: i === 0 ? 'nxt' : 'pend' }))
  )
}

async function pushMentor(title, body, tag) {
  await fetch(`${process.env.VITE_APP_URL || 'https://portal-mentoria.vercel.app'}/api/push-send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: MENTOR_ID, title, body, tag, url: '/' })
  }).catch(() => {})
}

function emailOnboarding(nome, m, link) {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f0ece4;border-radius:12px">
    <div style="font-family:Georgia,serif;font-size:24px;color:#c8a97a;margin-bottom:24px">Claudio Alecrim</div>
    <p style="font-size:15px;margin-bottom:8px">Olá, <strong>${nome}</strong>!</p>
    <p style="font-size:14px;color:#9a9590;margin-bottom:24px;line-height:1.6">
      Seu pagamento da <strong style="color:#c8a97a">${m}</strong> foi confirmado.<br/>
      Clique abaixo para preencher o alinhamento de expectativas e criar seu acesso.
    </p>
    <a href="${link}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:16px;border-radius:8px;text-align:center;font-weight:600;font-size:15px;margin-bottom:16px">
      Completar meu cadastro →
    </a>
    <p style="font-size:11px;color:#5a5550;text-align:center">Link pessoal · expira em 7 dias</p>
  </div>`
}
