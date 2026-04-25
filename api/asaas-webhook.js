// api/asaas-webhook.js — versão segura, sem chave hardcoded
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

// Chave vem EXCLUSIVAMENTE da variável de ambiente do Vercel
const ASAAS_KEY = process.env.ASAAS_API_KEY
const ASAAS_URL = ASAAS_KEY?.includes('hmlg')
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

const APP_URL = 'https://dash.claudioalecrim.com.br'
const MENTOR_ID = '00000000-0000-0000-0000-000000000001'
const PRODUTO_MENTORIA = {
  'governo-pessoal':  '10000000-0000-0000-0000-000000000001',
  'homem-espiritual': '10000000-0000-0000-0000-000000000002'
}

export const config = { api: { bodyParser: true } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!ASAAS_KEY) {
    console.log('[webhook] ERRO: ASAAS_API_KEY não configurada no Vercel')
    return res.status(500).json({ error: 'Configuração ausente' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  const event = body?.event
  const payment = body?.payment
  console.log('[webhook] event:', event, '| customer:', payment?.customer)

  if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event) && payment) {
    try { await handleConfirmado(payment) }
    catch (e) { console.log('[webhook] ERRO:', e.message) }
  } else if (['PAYMENT_OVERDUE', 'PAYMENT_DECLINED'].includes(event) && payment) {
    try { await handleNegado(payment, event) }
    catch (e) { console.log('[webhook] ERRO negado:', e.message) }
  }

  res.status(200).json({ ok: true })
}

async function handleConfirmado(payment) {
  const cli = await buscarCliente(payment.customer)
  if (!cli?.email) { console.log('[webhook] PAROU: sem email'); return }

  const { nome, email, telefone } = cli
  const desc = (payment.description || '').toLowerCase()
  const ref = (payment.externalReference || '').toLowerCase()

  let mentoriaId = PRODUTO_MENTORIA['governo-pessoal']
  if (desc.includes('homem') || desc.includes('espiritual') || ref.includes('homem') || ref.includes('espiritual')) {
    mentoriaId = PRODUTO_MENTORIA['homem-espiritual']
  }

  const { data: userExiste } = await supabase.from('usuarios').select('id').eq('email', email).single()
  let usuarioId = userExiste?.id

  if (!usuarioId) {
    const { data: u, error: e } = await supabase.from('usuarios')
      .insert({ nome, email, senha_hash: 'pendente', role: 'aluno', ativo: true })
      .select().single()
    console.log('[webhook] novo usuário:', u?.id, 'erro:', e?.message)
    usuarioId = u?.id
  }

  if (!usuarioId) return

  const { data: alunoExiste } = await supabase.from('alunos').select('id').eq('usuario_id', usuarioId).single()
  if (alunoExiste) {
    await supabase.from('alunos').update({ pagamento_status: 'ok', pagamento_aviso: null }).eq('id', alunoExiste.id)
    await supabase.from('parcelas').update({ paga: true }).eq('aluno_id', alunoExiste.id).eq('numero', payment.installmentNumber || 1)
    return
  }

  const token = crypto.randomBytes(32).toString('hex')
  const { data: novoAluno, error: errAluno } = await supabase.from('alunos').insert({
    usuario_id: usuarioId, mentoria_id: mentoriaId, progresso: 0, acesso_ativo: true,
    telefone, pagamento_status: 'ok',
    forma_pagamento: payment.billingType === 'BOLETO' ? 'boleto' : 'cartao',
    total_parcelas: payment.installmentCount || 1,
    onboarding_token: token, onboarding_concluido: false
  }).select().single()

  console.log('[webhook] novo aluno:', novoAluno?.id, 'erro:', errAluno?.message)
  if (!novoAluno?.id) return

  const { data: proc } = await supabase.from('processos')
    .insert({ aluno_id: novoAluno.id, mentoria_id: mentoriaId, status: 'ativo', progresso: 0 })
    .select().single()

  const { data: templates } = await supabase.from('encontros_template')
    .select('numero, nome').eq('mentoria_id', mentoriaId).order('numero')
  if (templates?.length) {
    await supabase.from('encontros').insert(
      templates.map((t, i) => ({ aluno_id: novoAluno.id, processo_id: proc?.id, numero: t.numero, nome: t.nome, status: i === 0 ? 'nxt' : 'pend' }))
    )
  }

  const { data: ferramentas } = await supabase.from('ferramentas').select('id, ativo_global')
  if (ferramentas?.length) {
    await supabase.from('ferramentas_aluno').insert(
      ferramentas.map(f => ({ aluno_id: novoAluno.id, ferramenta_id: f.id, habilitada: f.ativo_global }))
    )
  }

  await supabase.from('parcelas').insert({
    aluno_id: novoAluno.id, numero: 1, valor: payment.value,
    paga: payment.billingType !== 'BOLETO', boleto_url: payment.bankSlipUrl || null
  })

  const link = `${APP_URL}/cadastro?token=${token}`
  const m = mentoriaId === PRODUTO_MENTORIA['homem-espiritual'] ? 'Homem Espiritual' : 'Governo Pessoal'

  console.log('[webhook] enviando email para:', email)
  await resend.emails.send({
    from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
    to: email,
    subject: `Bem-vindo à ${m} — Complete seu cadastro`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:0;background:#f5f5f5">
        <div style="background:#0a0a0a;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
          <div style="font-family:Georgia,serif;font-size:26px;color:#c8a97a;font-weight:500">Claudio Alecrim</div>
          <div style="font-size:11px;color:#5a5550;letter-spacing:.2em;text-transform:uppercase;margin-top:4px">Portal de Mentoria</div>
        </div>
        <div style="background:#fff;padding:36px 40px">
          <p style="font-size:16px;color:#111">Olá, <strong>${nome}</strong>!</p>
          <p style="font-size:14px;color:#555;line-height:1.7">
            Seu pagamento da <strong style="color:#c8a97a">${m}</strong> foi confirmado.<br/>
            Clique abaixo para preencher o alinhamento de expectativas e criar seu acesso.
          </p>
          <a href="${link}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:16px;border-radius:8px;text-align:center;font-weight:600;font-size:15px;margin:24px 0">
            Completar meu cadastro →
          </a>
          <div style="background:#fafafa;border-radius:8px;padding:14px 18px">
            <div style="font-size:12px;color:#888;margin-bottom:4px">Após o cadastro, acesse sempre pelo endereço:</div>
            <a href="${APP_URL}" style="color:#c8a97a;font-size:14px;font-weight:500;text-decoration:none">${APP_URL}</a>
          </div>
          <p style="font-size:11px;color:#999;text-align:center;margin-top:16px">Link pessoal · expira em 7 dias</p>
        </div>
        <div style="background:#0a0a0a;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center">
          <p style="font-size:11px;color:#5a5550;margin:0">© Claudio Alecrim · claudioalecrim.com.br</p>
        </div>
      </div>
    `
  })

  await fetch(`${APP_URL}/api/push-send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: MENTOR_ID, title: 'Novo aluno — pagamento confirmado', body: `${nome} · ${m}`, tag: 'novo-aluno', url: '/' })
  }).catch(() => {})
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
  await supabase.from('alunos')
    .update({ pagamento_status: 'negado', pagamento_aviso: `Pagamento foi ${motivo}. Regularize para continuar acessando.` })
    .eq('id', aluno.id)
}

async function buscarCliente(customerId) {
  try {
    const r = await fetch(`${ASAAS_URL}/customers/${customerId}`, {
      headers: { 'access_token': ASAAS_KEY }
    })
    const c = await r.json()
    if (!c.email) return null
    return { nome: c.name || 'Aluno', email: c.email.toLowerCase().trim(), telefone: c.mobilePhone || '' }
  } catch (e) {
    console.log('[webhook] buscarCliente ERRO:', e.message)
    return null
  }
}
