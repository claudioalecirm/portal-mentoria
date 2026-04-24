// api/asaas-webhook.js — com body parser explícito
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

// Necessário para receber body do Asaas corretamente no Vercel
export const config = { api: { bodyParser: true } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Garante que o body foi parseado
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  const event = body?.event
  const payment = body?.payment
  const subscription = body?.subscription

  console.log('[webhook] body completo:', JSON.stringify(body).slice(0, 500))
  console.log('[webhook] event:', event)
  console.log('[webhook] customer:', payment?.customer)
  console.log('[webhook] externalReference:', payment?.externalReference)

  if (!event) {
    console.log('[webhook] ERRO: event indefinido — body mal formatado')
    return res.status(200).json({ ok: true, aviso: 'event undefined' })
  }

  if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event) && payment) {
    await handleConfirmado(payment)
  } else if (['PAYMENT_OVERDUE', 'PAYMENT_DECLINED'].includes(event) && payment) {
    await handleNegado(payment, event)
  } else if (event === 'SUBSCRIPTION_DELETED' && subscription) {
    await supabase.from('assinaturas')
      .update({ status: 'cancelado', cancelado_em: new Date().toISOString() })
      .eq('asaas_subscription_id', subscription.id)
  } else {
    console.log('[webhook] evento ignorado:', event)
  }

  res.status(200).json({ ok: true })
}

async function handleConfirmado(payment) {
  console.log('[handleConfirmado] iniciando — customer:', payment.customer)

  const cli = await buscarCliente(payment.customer)
  console.log('[handleConfirmado] cliente:', JSON.stringify(cli))
  if (!cli?.email) { console.log('[handleConfirmado] PAROU: sem email'); return }

  const { nome, email, telefone } = cli
  const mentoriaId = identificarMentoria(payment)
  console.log('[handleConfirmado] mentoria:', mentoriaId, '| email:', email)

  const { data: userExiste } = await supabase.from('usuarios').select('id').eq('email', email).single()
  console.log('[handleConfirmado] usuário existe:', userExiste?.id)

  let usuarioId = userExiste?.id
  if (!usuarioId) {
    const { data: u, error: e } = await supabase.from('usuarios')
      .insert({ nome, email, senha_hash: 'pendente', role: 'aluno', ativo: true })
      .select().single()
    console.log('[handleConfirmado] novo usuário:', u?.id, 'erro:', e?.message)
    usuarioId = u?.id
  }

  if (!usuarioId) { console.log('[handleConfirmado] PAROU: sem usuarioId'); return }

  const { data: alunoExiste } = await supabase.from('alunos').select('id').eq('usuario_id', usuarioId).single()
  console.log('[handleConfirmado] aluno existe:', alunoExiste?.id)

  if (alunoExiste) {
    await supabase.from('alunos').update({ pagamento_status: 'ok', pagamento_aviso: null }).eq('id', alunoExiste.id)
    await supabase.from('parcelas').update({ paga: true })
      .eq('aluno_id', alunoExiste.id).eq('numero', payment.installmentNumber || 1)
    console.log('[handleConfirmado] aluno existente atualizado')
    return
  }

  // Novo aluno
  const token = crypto.randomBytes(32).toString('hex')
  const { data: novoAluno, error: errAluno } = await supabase.from('alunos').insert({
    usuario_id: usuarioId, mentoria_id: mentoriaId, progresso: 0, acesso_ativo: true,
    telefone, pagamento_status: 'ok',
    forma_pagamento: payment.billingType === 'BOLETO' ? 'boleto' : 'cartao',
    total_parcelas: payment.installmentCount || 1,
    onboarding_token: token, onboarding_concluido: false
  }).select().single()
  console.log('[handleConfirmado] novo aluno:', novoAluno?.id, 'erro:', errAluno?.message)

  if (!novoAluno?.id) return

  const { data: proc } = await supabase.from('processos')
    .insert({ aluno_id: novoAluno.id, mentoria_id: mentoriaId, status: 'ativo', progresso: 0 })
    .select().single()

  await criarEncontros(novoAluno.id, proc?.id, mentoriaId)

  const { data: ferramentas } = await supabase.from('ferramentas').select('id, ativo_global')
  if (ferramentas?.length) {
    await supabase.from('ferramentas_aluno').insert(
      ferramentas.map(f => ({ aluno_id: novoAluno.id, ferramenta_id: f.id, habilitada: f.ativo_global }))
    )
  }

  await supabase.from('parcelas').insert([{
    aluno_id: novoAluno.id, numero: 1, valor: payment.value,
    paga: payment.billingType !== 'BOLETO',
    boleto_url: payment.bankSlipUrl || null
  }])

  const appUrl = process.env.VITE_APP_URL || 'https://portal-mentoria-suadevolutiva.vercel.app'
  const link = `${appUrl}/cadastro?token=${token}`
  const m = mentoriaNome(mentoriaId)

  console.log('[handleConfirmado] enviando email para:', email)
  const emailResult = await resend.emails.send({
    from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
    to: email,
    subject: `Bem-vindo à ${m} — Complete seu cadastro`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f0ece4;border-radius:12px">
      <div style="font-family:Georgia,serif;font-size:24px;color:#c8a97a;margin-bottom:24px">Claudio Alecrim</div>
      <p>Olá, <strong>${nome}</strong>!</p>
      <p style="color:#9a9590;line-height:1.6">Seu pagamento da <strong style="color:#c8a97a">${m}</strong> foi confirmado. Clique abaixo para completar seu cadastro.</p>
      <a href="${link}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:16px;border-radius:8px;text-align:center;font-weight:600;font-size:15px;margin:24px 0">Completar meu cadastro →</a>
      <p style="font-size:11px;color:#5a5550;text-align:center">Link pessoal · expira em 7 dias</p>
    </div>`
  })
  console.log('[handleConfirmado] email enviado:', JSON.stringify(emailResult))

  // Push mentor
  await fetch(`${appUrl}/api/push-send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: MENTOR_ID, title: 'Novo aluno — pagamento confirmado', body: `${nome} · ${m}`, tag: 'novo-aluno', url: '/' })
  }).catch(e => console.log('[handleConfirmado] push erro:', e.message))
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
  const aviso = `Pagamento da parcela ${payment.installmentNumber || ''} foi ${motivo}.`
  await supabase.from('alunos').update({ pagamento_status: 'negado', pagamento_aviso: aviso }).eq('id', aluno.id)
}

async function buscarCliente(customerId) {
  try {
    const url = `${ASAAS_URL}/customers/${customerId}`
    console.log('[buscarCliente] GET', url)
    const r = await fetch(url, { headers: { 'access_token': process.env.ASAAS_API_KEY } })
    const c = await r.json()
    console.log('[buscarCliente] status:', r.status, '| resposta:', JSON.stringify(c).slice(0, 300))
    if (!c.email) return null
    return { nome: c.name || 'Aluno', email: c.email.toLowerCase().trim(), telefone: c.mobilePhone || '' }
  } catch (e) {
    console.log('[buscarCliente] ERRO:', e.message)
    return null
  }
}

function identificarMentoria(p) {
  if (PRODUTO_MENTORIA[p.externalReference]) return PRODUTO_MENTORIA[p.externalReference]
  const d = (p.description || '').toLowerCase()
  if (d.includes('governo pessoal')) return PRODUTO_MENTORIA['governo-pessoal']
  if (d.includes('homem espiritual')) return PRODUTO_MENTORIA['homem-espiritual']
  return PRODUTO_MENTORIA['governo-pessoal']
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