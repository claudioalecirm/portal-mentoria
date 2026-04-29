// api/kiwify-webhook.js
const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')
const crypto = require('crypto')

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  // Validação do token Kiwify
  const tokenKiwify = process.env.KIWIFY_WEBHOOK_TOKEN
  if (tokenKiwify) {
    const tokenRecebido = req.headers['x-kiwify-token'] || req.query.token
    if (tokenRecebido !== tokenKiwify) {
      console.log('[kiwify] token inválido')
      return res.status(401).json({ error: 'Token inválido' })
    }
  }

  const status = body?.order_status
  console.log('[kiwify] status:', status, '| produto:', body?.Product?.name)

  if (!['paid', 'subscription_renewed'].includes(status)) {
    console.log('[kiwify] ignorado:', status)
    return res.status(200).json({ ok: true, ignorado: true })
  }

  const nome = body?.Customer?.name || 'Aluno'
  const email = body?.Customer?.email?.toLowerCase().trim()
  const telefone = body?.Customer?.mobile || body?.Customer?.phone || ''
  const nomeProduto = (body?.Product?.name || '').toLowerCase().trim()

  if (!email) {
    console.log('[kiwify] PAROU: sem email')
    return res.status(200).json({ ok: true, aviso: 'sem email' })
  }

  // Identifica mentoria
  let mentoriaId = null
  for (const [chave, id] of Object.entries(PRODUTO_MAP)) {
    if (nomeProduto.includes(chave)) { mentoriaId = id; break }
  }
  if (!mentoriaId) {
    if (nomeProduto.includes('mesa')) mentoriaId = PRODUTO_MAP['mesa do reino']
    else if (nomeProduto.includes('governo')) mentoriaId = PRODUTO_MAP['mentoria governo pessoal']
    else if (nomeProduto.includes('homem') || nomeProduto.includes('espiritual')) mentoriaId = PRODUTO_MAP['mentoria homem espiritual']
    else mentoriaId = PRODUTO_MAP['mentoria homem espiritual'] // fallback
  }

  console.log('[kiwify] email:', email, '| mentoriaId:', mentoriaId)

  // Verifica/cria usuário
  const { data: userExiste } = await supabase.from('usuarios').select('id').eq('email', email).single()
  let usuarioId = userExiste?.id

  if (!usuarioId) {
    const { data: novoUser, error: errUser } = await supabase.from('usuarios')
      .insert({ nome, email, senha_hash: 'pendente', role: 'aluno', ativo: true })
      .select().single()
    console.log('[kiwify] novo usuário:', novoUser?.id, 'erro:', errUser?.message)
    usuarioId = novoUser?.id
  }

  if (!usuarioId) return res.status(200).json({ ok: true, aviso: 'erro usuario' })

  // Verifica se já tem acesso a esta mentoria
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

  // Cria aluno
  const { data: novoAluno, error: errAluno } = await supabase.from('alunos').insert({
    usuario_id: usuarioId,
    mentoria_id: mentoriaId,
    progresso: 0,
    acesso_ativo: true,
    telefone,
    pagamento_status: 'ok',
    onboarding_token: isMesa ? null : token,
    onboarding_concluido: isMesa ? true : false
  }).select().single()

  console.log('[kiwify] novo aluno:', novoAluno?.id, 'erro:', errAluno?.message)
  if (!novoAluno?.id) return res.status(200).json({ ok: true, aviso: 'erro aluno' })

  if (!isMesa) {
    // Cria processo + encontros + ferramentas
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

    // Bônus: Mesa do Reino
    const { data: temMesa } = await supabase.from('alunos')
      .select('id').eq('usuario_id', usuarioId).eq('mentoria_id', MENTORIA_MESA).single()
    if (!temMesa) {
      await supabase.from('alunos').insert({
        usuario_id: usuarioId, mentoria_id: MENTORIA_MESA,
        progresso: 0, acesso_ativo: true, onboarding_concluido: true
      })
      console.log('[kiwify] Mesa do Reino liberada como bônus')
    }
  }

  // Nomes dos produtos
  const mentoriaNome = nomeProduto.includes('governo') ? 'Mentoria Governo Pessoal'
    : nomeProduto.includes('espiritual') ? 'Mentoria Homem Espiritual'
    : 'Mesa do Reino'

  // Envia email
  if (isMesa) {
    await enviarEmailAcessoMesa(email, nome)
  } else {
    const linkOnboarding = `${APP_URL}/cadastro?token=${token}`
    await enviarEmailOnboarding(email, nome, mentoriaNome, linkOnboarding)
  }

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

  console.log('[kiwify] concluído para:', email)
  res.status(200).json({ ok: true, aluno_id: novoAluno.id })
}

async function enviarEmailOnboarding(email, nome, mentoria, link) {
  await resend.emails.send({
    from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
    to: email,
    subject: `Bem-vindo à ${mentoria} — Complete seu cadastro`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:0;background:#f5f5f5">
        <div style="background:#0a0a0a;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
          <div style="font-family:Georgia,serif;font-size:26px;color:#c8a97a;font-weight:500">Claudio Alecrim</div>
          <div style="font-size:11px;color:#5a5550;letter-spacing:.2em;text-transform:uppercase;margin-top:4px">Portal de Mentoria</div>
        </div>
        <div style="background:#fff;padding:36px 40px">
          <p style="font-size:16px;color:#111">Olá, <strong>${nome}</strong>!</p>
          <p style="font-size:14px;color:#555;line-height:1.7">
            Seu pagamento da <strong style="color:#c8a97a">${mentoria}</strong> foi confirmado.<br/>
            Clique abaixo para preencher o alinhamento de expectativas e criar seu acesso ao portal.
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
  }).catch(e => console.log('[kiwify] erro email:', e.message))
}

async function enviarEmailAcessoMesa(email, nome) {
  await resend.emails.send({
    from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
    to: email,
    subject: 'Bem-vindo à Mesa do Reino — Acesse seu portal',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:0;background:#f5f5f5">
        <div style="background:#0a0a0a;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
          <div style="font-family:Georgia,serif;font-size:26px;color:#c8a97a;font-weight:500">Claudio Alecrim</div>
          <div style="font-size:11px;color:#5a5550;letter-spacing:.2em;text-transform:uppercase;margin-top:4px">Mesa do Reino</div>
        </div>
        <div style="background:#fff;padding:36px 40px">
          <p style="font-size:16px;color:#111">Olá, <strong>${nome}</strong>!</p>
          <p style="font-size:14px;color:#555;line-height:1.7">
            Seu acesso à <strong style="color:#c8a97a">Mesa do Reino</strong> foi confirmado.<br/>
            Clique abaixo para acessar o portal e criar sua senha.
          </p>
          <a href="${APP_URL}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:16px;border-radius:8px;text-align:center;font-weight:600;font-size:15px;margin:24px 0">
            Acessar o Portal →
          </a>
          <div style="background:#fafafa;border-radius:8px;padding:14px 18px;margin-bottom:16px">
            <div style="font-size:12px;color:#888;margin-bottom:6px">Suas credenciais:</div>
            <div style="font-size:13px;color:#333;margin-bottom:4px"><strong>Login:</strong> ${email}</div>
            <div style="font-size:12px;color:#888">Clique em "Esqueci minha senha" para criar sua senha no primeiro acesso.</div>
          </div>
          <p style="font-size:12px;color:#888;line-height:1.6">
            As cobranças são realizadas todo dia <strong>4 de cada mês</strong> pela Kiwify.
          </p>
        </div>
        <div style="background:#0a0a0a;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center">
          <p style="font-size:11px;color:#5a5550;margin:0">© Claudio Alecrim · claudioalecrim.com.br</p>
        </div>
      </div>
    `
  }).catch(e => console.log('[kiwify] erro email mesa:', e.message))
}
