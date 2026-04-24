// api/asaas-webhook.js — v5 robusto
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

// URLs do Asaas
const ASAAS_URL = process.env.ASAAS_API_KEY?.includes('hmlg')
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

const MENTOR_ID = '00000000-0000-0000-0000-000000000001'
const PRODUTO_MENTORIA = {
  'governo-pessoal':  '10000000-0000-0000-0000-000000000001',
  'homem-espiritual': '10000000-0000-0000-0000-000000000002'
}

export const config = { api: { bodyParser: true } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  const event = body?.event
  const payment = body?.payment

  console.log('[v5] event:', event, '| customer:', payment?.customer, '| ref:', payment?.externalReference, '| desc:', payment?.description)

  if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event) && payment) {
    try {
      await handleConfirmado(payment)
    } catch (e) {
      console.log('[v5] ERRO handleConfirmado:', e.message, e.stack)
    }
  } else if (['PAYMENT_OVERDUE', 'PAYMENT_DECLINED'].includes(event) && payment) {
    try {
      await handleNegado(payment, event)
    } catch (e) {
      console.log('[v5] ERRO handleNegado:', e.message)
    }
  } else {
    console.log('[v5] evento ignorado ou sem payment:', event)
  }

  res.status(200).json({ ok: true })
}

async function handleConfirmado(payment) {
  // 1. Busca dados do cliente no Asaas
  const cli = await buscarCliente(payment.customer)
  console.log('[handleConfirmado] cliente:', JSON.stringify(cli))

  if (!cli?.email) {
    console.log('[handleConfirmado] PAROU: cliente sem email')
    return
  }

  const { nome, email, telefone } = cli

  // 2. Identifica mentoria — externalReference OU description
  let mentoriaId = null
  const ref = (payment.externalReference || '').toLowerCase().trim()
  const desc = (payment.description || '').toLowerCase()

  if (ref.includes('governo') || desc.includes('governo')) {
    mentoriaId = PRODUTO_MENTORIA['governo-pessoal']
  } else if (ref.includes('homem') || ref.includes('espiritual') || desc.includes('homem') || desc.includes('espiritual')) {
    mentoriaId = PRODUTO_MENTORIA['homem-espiritual']
  } else {
    // Fallback — usa Governo Pessoal como padrão
    mentoriaId = PRODUTO_MENTORIA['governo-pessoal']
    console.log('[handleConfirmado] mentoria não identificada, usando fallback Governo Pessoal')
  }
  console.log('[handleConfirmado] mentoriaId:', mentoriaId)

  // 3. Verifica se usuário já existe
  const { data: userExiste } = await supabase
    .from('usuarios').select('id').eq('email', email).single()
  console.log('[handleConfirmado] usuário existe:', userExiste?.id)

  let usuarioId = userExiste?.id

  if (!usuarioId) {
    const { data: u, error: e } = await supabase.from('usuarios')
      .insert({ nome, email, senha_hash: 'pendente', role: 'aluno', ativo: true })
      .select().single()
    console.log('[handleConfirmado] novo usuário criado:', u?.id, 'erro:', e?.message)
    usuarioId = u?.id
  }

  if (!usuarioId) {
    console.log('[handleConfirmado] PAROU: sem usuarioId')
    return
  }

  // 4. Verifica se já tem aluno
  const { data: alunoExiste } = await supabase
    .from('alunos').select('id, pagamento_status').eq('usuario_id', usuarioId).single()

  if (alunoExiste) {
    console.log('[handleConfirmado] aluno já existe:', alunoExiste.id, '— atualizando parcela')
    await supabase.from('alunos')
      .update({ pagamento_status: 'ok', pagamento_aviso: null })
      .eq('id', alunoExiste.id)
    await supabase.from('parcelas')
      .update({ paga: true })
      .eq('aluno_id', alunoExiste.id)
      .eq('numero', payment.installmentNumber || 1)
    return
  }

  // 5. Cria novo aluno + token de onboarding
  const token = crypto.randomBytes(32).toString('hex')
  const { data: novoAluno, error: errAluno } = await supabase.from('alunos').insert({
    usuario_id: usuarioId,
    mentoria_id: mentoriaId,
    progresso: 0,
    acesso_ativo: true,
    telefone,
    pagamento_status: 'ok',
    forma_pagamento: payment.billingType === 'BOLETO' ? 'boleto' : 'cartao',
    total_parcelas: payment.installmentCount || 1,
    onboarding_token: token,
    onboarding_concluido: false
  }).select().single()

  console.log('[handleConfirmado] novo aluno:', novoAluno?.id, 'erro:', errAluno?.message)
  if (!novoAluno?.id) return

  // 6. Cria processo
  const { data: proc } = await supabase.from('processos')
    .insert({ aluno_id: novoAluno.id, mentoria_id: mentoriaId, status: 'ativo', progresso: 0 })
    .select().single()
  console.log('[handleConfirmado] processo:', proc?.id)

  // 7. Cria encontros
  const { data: templates } = await supabase.from('encontros_template')
    .select('numero, nome').eq('mentoria_id', mentoriaId).order('numero')
  if (templates?.length) {
    await supabase.from('encontros').insert(
      templates.map((t, i) => ({
        aluno_id: novoAluno.id, processo_id: proc?.id,
        numero: t.numero, nome: t.nome,
        status: i === 0 ? 'nxt' : 'pend'
      }))
    )
    console.log('[handleConfirmado] encontros criados:', templates.length)
  }

  // 8. Habilita ferramentas
  const { data: ferramentas } = await supabase.from('ferramentas').select('id, ativo_global')
  if (ferramentas?.length) {
    await supabase.from('ferramentas_aluno').insert(
      ferramentas.map(f => ({ aluno_id: novoAluno.id, ferramenta_id: f.id, habilitada: f.ativo_global }))
    )
  }

  // 9. Registra parcela
  await supabase.from('parcelas').insert({
    aluno_id: novoAluno.id, numero: 1, valor: payment.value,
    paga: payment.billingType !== 'BOLETO',
    boleto_url: payment.bankSlipUrl || null
  })

  // 10. Envia email de onboarding
  const appUrl = process.env.VITE_APP_URL || 'https://portal-mentoria-suadevolutiva.vercel.app'
  const link = `${appUrl}/cadastro?token=${token}`
  const mentoriaNome = mentoriaId === PRODUTO_MENTORIA['governo-pessoal'] ? 'Governo Pessoal' : 'Homem Espiritual'

  console.log('[handleConfirmado] enviando email para:', email, '| link:', link.slice(0, 80))

  const emailResult = await resend.emails.send({
    from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
    to: email,
    subject: `Bem-vindo à ${mentoriaNome} — Complete seu cadastro`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f0ece4;border-radius:12px">
        <div style="font-family:Georgia,serif;font-size:24px;color:#c8a97a;margin-bottom:24px">Claudio Alecrim</div>
        <p style="font-size:15px">Olá, <strong>${nome}</strong>!</p>
        <p style="font-size:14px;color:#9a9590;line-height:1.7">
          Seu pagamento da <strong style="color:#c8a97a">${mentoriaNome}</strong> foi confirmado.<br/>
          Clique abaixo para preencher o alinhamento de expectativas e criar seu acesso ao portal.
        </p>
        <a href="${link}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:16px;border-radius:8px;text-align:center;font-weight:600;font-size:15px;margin:24px 0">
          Completar meu cadastro →
        </a>
        <div style="background:#171717;border-radius:8px;padding:14px 18px;margin-bottom:16px">
          <div style="font-size:11px;color:#5a5550;margin-bottom:4px">Após o cadastro, acesse sempre pelo endereço:</div>
          <a href="${appUrl}" style="color:#c8a97a;font-size:13px;text-decoration:none">${appUrl}</a>
        </div>
        <p style="font-size:11px;color:#5a5550;text-align:center">Link pessoal e intransferível · expira em 7 dias</p>
      </div>
    `
  })

  console.log('[handleConfirmado] resultado email:', JSON.stringify(emailResult))

  // 11. Push para mentor
  const appUrlFinal = process.env.VITE_APP_URL || 'https://portal-mentoria-suadevolutiva.vercel.app'
  await fetch(`${appUrlFinal}/api/push-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usuario_id: MENTOR_ID,
      title: 'Novo aluno — pagamento confirmado',
      body: `${nome} · ${mentoriaNome}`,
      tag: 'novo-aluno', url: '/'
    })
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
  const aviso = `Pagamento da parcela ${payment.installmentNumber || ''} foi ${motivo}. Regularize para continuar acessando.`
  await supabase.from('alunos').update({ pagamento_status: 'negado', pagamento_aviso: aviso }).eq('id', aluno.id)
  console.log('[handleNegado] aluno atualizado:', aluno.id, '| motivo:', motivo)
}

async function buscarCliente(customerId) {
  const url = `${ASAAS_URL}/customers/${customerId}`
  console.log('[buscarCliente] GET', url)
  try {
    const r = await fetch(url, {
      headers: {
        'access_token': process.env.ASAAS_API_KEY,
        'Content-Type': 'application/json'
      }
    })
    const text = await r.text()
    console.log('[buscarCliente] status:', r.status, '| body:', text.slice(0, 300))
    const c = JSON.parse(text)
    if (!c.email) {
      console.log('[buscarCliente] email não encontrado na resposta')
      return null
    }
    return { nome: c.name || 'Aluno', email: c.email.toLowerCase().trim(), telefone: c.mobilePhone || '' }
  } catch (e) {
    console.log('[buscarCliente] ERRO:', e.message)
    return null
  }
}
