// api/asaas-webhook.js — v2
// Ao confirmar pagamento: cria usuário provisional + gera token de onboarding
// Envia email com link para /cadastro?token=XXX onde aluno preenche o formulário
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

const PRODUTO_MENTORIA = {
  'governo-pessoal': '10000000-0000-0000-0000-000000000001',
  'homem-espiritual': '10000000-0000-0000-0000-000000000002'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const evento = req.body
  const eventosValidos = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']
  if (!eventosValidos.includes(evento.event)) {
    return res.status(200).json({ ok: true, ignorado: true })
  }

  const payment = evento.payment
  if (!payment) return res.status(400).json({ error: 'Dados ausentes' })

  // Busca cliente no Asaas
  const clienteRes = await fetch(`https://api.asaas.com/v3/customers/${payment.customer}`, {
    headers: { 'access_token': process.env.ASAAS_API_KEY }
  })
  const cliente = await clienteRes.json()
  const nome = cliente.name || 'Aluno'
  const email = cliente.email?.toLowerCase().trim()
  const telefone = cliente.mobilePhone || cliente.phone || ''
  if (!email) return res.status(400).json({ error: 'Email não encontrado' })

  // Identifica mentoria
  const ref = payment.externalReference || ''
  const desc = (payment.description || '').toLowerCase()
  let mentoriaId = PRODUTO_MENTORIA[ref]
  if (!mentoriaId) {
    if (desc.includes('governo pessoal')) mentoriaId = PRODUTO_MENTORIA['governo-pessoal']
    else if (desc.includes('homem espiritual')) mentoriaId = PRODUTO_MENTORIA['homem-espiritual']
  }

  // Verifica se usuário já existe
  const { data: usuarioExistente } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .single()

  let usuarioId = usuarioExistente?.id
  let alunoId = null
  let isNovoAluno = false

  if (!usuarioExistente) {
    // Cria usuário provisional (sem senha definida ainda)
    const { data: novoUser } = await supabase
      .from('usuarios')
      .insert({ nome, email, senha_hash: 'pendente', role: 'aluno', ativo: true })
      .select().single()
    usuarioId = novoUser?.id
    isNovoAluno = true
  }

  if (usuarioId) {
    // Verifica se já tem aluno vinculado
    const { data: alunoExistente } = await supabase
      .from('alunos')
      .select('id, onboarding_concluido')
      .eq('usuario_id', usuarioId)
      .single()

    if (alunoExistente) {
      alunoId = alunoExistente.id
      // Aluno existente comprando nova mentoria
      if (mentoriaId) {
        // Cria novo processo para a nova mentoria
        const { data: novoProc } = await supabase
          .from('processos')
          .insert({ aluno_id: alunoId, mentoria_id: mentoriaId, status: 'ativo', progresso: 0 })
          .select().single()

        // Cria encontros da nova mentoria
        await criarEncontros(alunoId, novoProc.id, mentoriaId)

        // Notifica que aluno antigo renovou/comprou nova mentoria
        await notificarMentor(req, nome, 'renovacao', mentoriaId)
        await enviarEmailRenovacao(email, nome, mentoriaId)
      }
    } else {
      // Novo aluno — gera token de onboarding
      const token = crypto.randomBytes(32).toString('hex')

      const { data: novoAluno } = await supabase
        .from('alunos')
        .insert({
          usuario_id: usuarioId,
          mentoria_id: mentoriaId,
          progresso: 0,
          acesso_ativo: true,
          telefone,
          forma_pagamento: payment.billingType === 'BOLETO' ? 'boleto' : 'cartao',
          total_parcelas: payment.installmentCount || 1,
          onboarding_token: token,
          onboarding_concluido: false
        })
        .select().single()
      alunoId = novoAluno?.id

      // Cria processo
      const { data: proc } = await supabase
        .from('processos')
        .insert({ aluno_id: alunoId, mentoria_id: mentoriaId, status: 'ativo', progresso: 0 })
        .select().single()

      // Cria encontros
      await criarEncontros(alunoId, proc.id, mentoriaId)

      // Habilita ferramentas
      const { data: ferramentas } = await supabase.from('ferramentas').select('id, ativo_global')
      if (ferramentas?.length) {
        await supabase.from('ferramentas_aluno').insert(
          ferramentas.map(f => ({ aluno_id: alunoId, ferramenta_id: f.id, habilitada: f.ativo_global }))
        )
      }

      // Registra parcelas
      await registrarParcelas(alunoId, payment)

      // Envia email com link para o formulário de cadastro
      const linkCadastro = `${process.env.VITE_APP_URL || 'https://portal-mentoria.vercel.app'}/cadastro?token=${token}`
      await enviarEmailOnboarding(email, nome, linkCadastro, mentoriaId)

      // Notifica mentor
      await notificarMentor(req, nome, 'novo', mentoriaId)
    }
  }

  res.status(200).json({ ok: true, aluno_id: alunoId })
}

async function criarEncontros(alunoId, processoId, mentoriaId) {
  if (!mentoriaId) return
  const { data: templates } = await supabase
    .from('encontros_template')
    .select('numero, nome')
    .eq('mentoria_id', mentoriaId)
    .order('numero')

  if (templates?.length) {
    await supabase.from('encontros').insert(
      templates.map((t, i) => ({
        aluno_id: alunoId,
        processo_id: processoId,
        numero: t.numero,
        nome: t.nome,
        status: i === 0 ? 'nxt' : 'pend'
      }))
    )
  }
}

async function registrarParcelas(alunoId, payment) {
  const total = payment.installmentCount || 1
  const parcelas = Array.from({ length: total }, (_, i) => ({
    aluno_id: alunoId,
    numero: i + 1,
    valor: payment.value,
    paga: i === 0 && payment.billingType !== 'BOLETO',
    boleto_url: i === 0 ? (payment.bankSlipUrl || null) : null
  }))
  await supabase.from('parcelas').insert(parcelas)
}

async function enviarEmailOnboarding(email, nome, linkCadastro, mentoriaId) {
  const mentoriaNome = mentoriaId === '10000000-0000-0000-0000-000000000001'
    ? 'Governo Pessoal' : 'Homem Espiritual'

  await resend.emails.send({
    from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
    to: email,
    subject: `Bem-vindo à Mentoria ${mentoriaNome} — Complete seu cadastro`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f0ece4;border-radius:12px">
        <div style="font-family:Georgia,serif;font-size:24px;color:#c8a97a;margin-bottom:24px">Claudio Alecrim</div>
        <p style="font-size:16px;margin-bottom:8px">Olá, <strong>${nome}</strong>!</p>
        <p style="font-size:14px;color:#9a9590;margin-bottom:8px;line-height:1.6">
          Seu pagamento da <strong style="color:#c8a97a">${mentoriaNome}</strong> foi confirmado.
        </p>
        <p style="font-size:14px;color:#9a9590;margin-bottom:24px;line-height:1.6">
          Para acessar o portal, clique no botão abaixo e preencha o formulário de alinhamento. 
          Leva menos de 5 minutos e vai me ajudar a personalizar todo o processo para você.
        </p>
        <a href="${linkCadastro}"
           style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:16px;border-radius:8px;text-align:center;font-weight:600;font-size:15px;margin-bottom:20px">
          Completar meu cadastro →
        </a>
        <p style="font-size:12px;color:#5a5550;text-align:center">
          Este link é pessoal e expira em 7 dias. Não compartilhe.
        </p>
      </div>
    `
  }).catch(() => {})
}

async function enviarEmailRenovacao(email, nome, mentoriaId) {
  const mentoriaNome = mentoriaId === '10000000-0000-0000-0000-000000000001'
    ? 'Governo Pessoal' : 'Homem Espiritual'
  const appUrl = process.env.VITE_APP_URL || 'https://portal-mentoria.vercel.app'

  await resend.emails.send({
    from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
    to: email,
    subject: `Nova mentoria adicionada: ${mentoriaNome}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f0ece4;border-radius:12px">
        <div style="font-family:Georgia,serif;font-size:24px;color:#c8a97a;margin-bottom:24px">Claudio Alecrim</div>
        <p style="font-size:15px;margin-bottom:16px">Olá, <strong>${nome}</strong>!</p>
        <p style="font-size:14px;color:#9a9590;margin-bottom:24px;line-height:1.6">
          A mentoria <strong style="color:#c8a97a">${mentoriaNome}</strong> foi adicionada ao seu portal.
          Acesse com seu login e senha habituais.
        </p>
        <a href="${appUrl}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:14px;border-radius:8px;text-align:center;font-weight:500;font-size:14px">
          Acessar o Portal →
        </a>
      </div>
    `
  }).catch(() => {})
}

async function notificarMentor(req, nome, tipo, mentoriaId) {
  const mentoriaNome = mentoriaId === '10000000-0000-0000-0000-000000000001'
    ? 'Governo Pessoal' : 'Homem Espiritual'
  const title = tipo === 'novo' ? 'Novo aluno — pagamento confirmado' : 'Aluno renovou / nova mentoria'
  const body = `${nome} · ${mentoriaNome}`

  await fetch(`${req.headers.origin || process.env.VITE_APP_URL}/api/push-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usuario_id: '00000000-0000-0000-0000-000000000001',
      title, body, tag: 'novo-aluno', url: '/'
    })
  }).catch(() => {})
}
