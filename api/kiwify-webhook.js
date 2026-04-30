// api/kiwify-webhook.js
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = 'https://dash.claudioalecrim.com.br'
const MENTOR_ID = '00000000-0000-0000-0000-000000000001'
const PRODUTO_MAP = {
  'mesa do reino':             '10000000-0000-0000-0000-000000000003',
  'mentoria governo pessoal':  '10000000-0000-0000-0000-000000000001',
  'mentoria homem espiritual': '10000000-0000-0000-0000-000000000002',
}
const MENTORIA_MESA = '10000000-0000-0000-0000-000000000003'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  const status = body?.order_status
  console.log('[kiwify] status:', status, '| produto:', body?.Product?.name, '| email:', body?.Customer?.email)

  if (!['paid', 'subscription_renewed'].includes(status)) {
    console.log('[kiwify] ignorado:', status)
    return res.status(200).json({ ok: true, ignorado: true })
  }

  const nome = body?.Customer?.name || 'Aluno'
  const email = body?.Customer?.email?.toLowerCase()?.trim()
  const telefone = body?.Customer?.mobile || body?.Customer?.phone || ''
  const nomeProduto = (body?.Product?.name || '').toLowerCase().trim()

  if (!email) {
    console.log('[kiwify] PAROU: sem email')
    return res.status(200).json({ ok: true, aviso: 'sem_email' })
  }

  // Identifica mentoria
  let mentoriaId = null
  for (const [chave, id] of Object.entries(PRODUTO_MAP)) {
    if (nomeProduto.includes(chave)) { mentoriaId = id; break }
  }
  if (!mentoriaId) {
    if (nomeProduto.includes('mesa')) mentoriaId = PRODUTO_MAP['mesa do reino']
    else if (nomeProduto.includes('governo')) mentoriaId = PRODUTO_MAP['mentoria governo pessoal']
    else mentoriaId = PRODUTO_MAP['mentoria homem espiritual']
  }
  console.log('[kiwify] mentoria identificada:', mentoriaId)

  // Verifica/cria usuário
  const { data: userExiste } = await supabase.from('usuarios').select('id').eq('email', email).single()
  let usuarioId = userExiste?.id

  if (!usuarioId) {
    const { data: u, error: e } = await supabase.from('usuarios')
      .insert({ nome, email, senha_hash: 'pendente', role: 'aluno', ativo: true })
      .select().single()
    console.log('[kiwify] novo usuário:', u?.id, 'erro:', e?.message)
    usuarioId = u?.id
  }

  if (!usuarioId) {
    console.log('[kiwify] PAROU: falha ao criar usuário')
    return res.status(200).json({ ok: true, aviso: 'erro_usuario' })
  }

  // Verifica se já tem acesso
  const { data: alunoExiste } = await supabase.from('alunos')
    .select('id').eq('usuario_id', usuarioId).eq('mentoria_id', mentoriaId).single()

  if (alunoExiste) {
    console.log('[kiwify] aluno já existe nesta mentoria')
    if (status === 'subscription_renewed') {
      await supabase.from('alunos').update({ acesso_ativo: true }).eq('id', alunoExiste.id)
    }
    return res.status(200).json({ ok: true, aviso: 'aluno_ja_existe' })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const isMesa = mentoriaId === MENTORIA_MESA

  const { data: novoAluno, error: errAluno } = await supabase.from('alunos').insert({
    usuario_id: usuarioId,
    mentoria_id: mentoriaId,
    progresso: 0, acesso_ativo: true, telefone, pagamento_status: 'ok',
    onboarding_token: isMesa ? null : token,
    onboarding_concluido: isMesa ? true : false
  }).select().single()

  console.log('[kiwify] aluno criado:', novoAluno?.id, 'erro:', errAluno?.message)
  if (!novoAluno?.id) return res.status(200).json({ ok: true, aviso: 'erro_aluno' })

  if (!isMesa) {
    const { data: proc } = await supabase.from('processos')
      .insert({ aluno_id: novoAluno.id, mentoria_id: mentoriaId, status: 'ativo', progresso: 0 })
      .select().single()

    const { data: templates } = await supabase.from('encontros_template')
      .select('numero, nome').eq('mentoria_id', mentoriaId).order('numero')
    if (templates?.length) {
      await supabase.from('encontros').insert(
        templates.map((t, i) => ({
          aluno_id: novoAluno.id, processo_id: proc?.id,
          numero: t.numero, nome: t.nome, status: i === 0 ? 'nxt' : 'pend'
        }))
      )
    }

    const { data: ferramentas } = await supabase.from('ferramentas').select('id, ativo_global')
    if (ferramentas?.length) {
      await supabase.from('ferramentas_aluno').insert(
        ferramentas.map(f => ({ aluno_id: novoAluno.id, ferramenta_id: f.id, habilitada: f.ativo_global }))
      )
    }

    // Bônus Mesa do Reino
    const { data: temMesa } = await supabase.from('alunos')
      .select('id').eq('usuario_id', usuarioId).eq('mentoria_id', MENTORIA_MESA).single()
    if (!temMesa) {
      await supabase.from('alunos').insert({
        usuario_id: usuarioId, mentoria_id: MENTORIA_MESA,
        progresso: 0, acesso_ativo: true, onboarding_concluido: true
      })
    }
  }

  const mentoriaNome = mentoriaId === '10000000-0000-0000-0000-000000000001' ? 'Mentoria Governo Pessoal'
    : mentoriaId === '10000000-0000-0000-0000-000000000002' ? 'Mentoria Homem Espiritual'
    : 'Mesa do Reino'

  // Envia email
  let emailResult
  if (isMesa) {
    emailResult = await resend.emails.send({
      from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
      to: email,
      subject: 'Bem-vindo à Mesa do Reino',
      html: emailMesa(nome, email)
    })
  } else {
    const link = `${APP_URL}/cadastro?token=${token}`
    emailResult = await resend.emails.send({
      from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
      to: email,
      subject: `Bem-vindo à ${mentoriaNome} — Complete seu cadastro`,
      html: emailOnboarding(nome, mentoriaNome, link)
    })
  }
  console.log('[kiwify] email resultado:', JSON.stringify(emailResult))

  // Push mentor
  await fetch(`${APP_URL}/api/push-send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usuario_id: MENTOR_ID,
      title: 'Nova venda — Kiwify',
      body: `${nome} · ${mentoriaNome}`,
      tag: 'nova-venda', url: '/'
    })
  }).catch(() => {})

  console.log('[kiwify] CONCLUÍDO:', email)
  res.status(200).json({ ok: true, aluno_id: novoAluno.id })
}

function emailOnboarding(nome, mentoria, link) {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f5f5f5">
    <div style="background:#0a0a0a;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
      <div style="font-family:Georgia,serif;font-size:26px;color:#c8a97a;font-weight:500">Claudio Alecrim</div>
      <div style="font-size:11px;color:#5a5550;letter-spacing:.2em;text-transform:uppercase;margin-top:4px">Portal de Mentoria</div>
    </div>
    <div style="background:#fff;padding:36px 40px">
      <p style="font-size:16px;color:#111;margin-bottom:12px">Olá, <strong>${nome}</strong>!</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:24px">
        Seu pagamento da <strong style="color:#c8a97a">${mentoria}</strong> foi confirmado.<br/>
        Clique abaixo para preencher o alinhamento de expectativas e criar seu acesso ao portal.
      </p>
      <a href="${link}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:16px;border-radius:8px;text-align:center;font-weight:600;font-size:15px;margin-bottom:24px">
        Completar meu cadastro →
      </a>
      <div style="background:#fafafa;border-radius:8px;padding:14px 18px;margin-bottom:16px">
        <div style="font-size:12px;color:#888;margin-bottom:4px">Após o cadastro, acesse sempre pelo endereço:</div>
        <a href="https://dash.claudioalecrim.com.br" style="color:#c8a97a;font-size:14px;font-weight:500;text-decoration:none">dash.claudioalecrim.com.br</a>
      </div>
      <p style="font-size:11px;color:#999;text-align:center">Link pessoal · expira em 7 dias</p>
    </div>
    <div style="background:#0a0a0a;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center">
      <p style="font-size:11px;color:#5a5550;margin:0">© Claudio Alecrim · claudioalecrim.com.br</p>
    </div>
  </div>`
}

function emailMesa(nome, email) {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f5f5f5">
    <div style="background:#0a0a0a;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
      <div style="font-family:Georgia,serif;font-size:26px;color:#c8a97a;font-weight:500">Claudio Alecrim</div>
      <div style="font-size:11px;color:#5a5550;letter-spacing:.2em;text-transform:uppercase;margin-top:4px">Mesa do Reino</div>
    </div>
    <div style="background:#fff;padding:36px 40px">
      <p style="font-size:16px;color:#111;margin-bottom:12px">Olá, <strong>${nome}</strong>!</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:24px">
        Seu acesso à <strong style="color:#c8a97a">Mesa do Reino</strong> foi confirmado.<br/>
        Acesse o portal com seu email e crie sua senha clicando em "Esqueci minha senha".
      </p>
      <div style="background:#fafafa;border-radius:8px;padding:16px 18px;margin-bottom:20px">
        <div style="font-size:12px;color:#888;margin-bottom:4px">Seu login:</div>
        <div style="font-size:14px;color:#333;font-weight:500">${email}</div>
      </div>
      <a href="https://dash.claudioalecrim.com.br" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:16px;border-radius:8px;text-align:center;font-weight:600;font-size:15px;margin-bottom:16px">
        Acessar o Portal →
      </a>
      <p style="font-size:12px;color:#888;text-align:center">
        Cobranças realizadas todo dia <strong>4 de cada mês</strong> pela Kiwify.
      </p>
    </div>
    <div style="background:#0a0a0a;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center">
      <p style="font-size:11px;color:#5a5550;margin:0">© Claudio Alecrim · claudioalecrim.com.br</p>
    </div>
  </div>`
}
