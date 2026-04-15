// api/onboarding.js
// Gerencia o fluxo pós-pagamento:
// GET ?action=validar&token=XXX — valida token e retorna dados da mentoria
// POST ?action=cadastrar — salva alinhamento + cria usuário + senha
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  const { action } = req.query

  // ─── VALIDAR TOKEN ───
  if (req.method === 'GET' && action === 'validar') {
    const { token } = req.query
    if (!token) return res.status(400).json({ error: 'Token inválido' })

    const { data: aluno } = await supabase
      .from('alunos')
      .select('id, onboarding_concluido, usuarios(nome, email), mentorias(nome)')
      .eq('onboarding_token', token)
      .single()

    if (!aluno) return res.status(404).json({ error: 'Link inválido ou expirado' })
    if (aluno.onboarding_concluido) return res.status(400).json({ error: 'Este cadastro já foi concluído', ja_concluido: true })

    return res.status(200).json({
      valido: true,
      nome: aluno.usuarios?.nome || '',
      email: aluno.usuarios?.email || '',
      mentoria: aluno.mentorias?.nome || '',
      aluno_id: aluno.id
    })
  }

  // ─── CADASTRAR (alinhamento + senha) ───
  if (req.method === 'POST' && action === 'cadastrar') {
    const {
      token, senha,
      // Alinhamento de expectativas
      motivacao, resultado_esperado, area_foco, grande_desafio,
      obstaculo, satisfacao_atual, tentativas_anteriores,
      comprometimento, visao_ideal, info_adicional, telefone
    } = req.body

    if (!token || !senha) return res.status(400).json({ error: 'Dados incompletos' })
    if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter mínimo 6 caracteres' })

    // Busca aluno pelo token
    const { data: aluno } = await supabase
      .from('alunos')
      .select('id, usuario_id, mentoria_id, onboarding_concluido, usuarios(nome, email), mentorias(nome)')
      .eq('onboarding_token', token)
      .single()

    if (!aluno) return res.status(404).json({ error: 'Token inválido' })
    if (aluno.onboarding_concluido) return res.status(400).json({ error: 'Cadastro já concluído' })

    const email = aluno.usuarios?.email
    const nome = aluno.usuarios?.nome

    // Define senha
    const senhaHash = `aluno_hash_${senha}`
    await supabase.from('usuarios').update({ senha_hash: senhaHash }).eq('id', aluno.usuario_id)

    // Atualiza telefone se fornecido
    if (telefone) {
      await supabase.from('alunos').update({ telefone }).eq('id', aluno.id)
    }

    // Busca ou cria processo
    let processoId = null
    const { data: processoExistente } = await supabase
      .from('processos')
      .select('id')
      .eq('aluno_id', aluno.id)
      .eq('mentoria_id', aluno.mentoria_id)
      .eq('status', 'ativo')
      .single()

    if (processoExistente) {
      processoId = processoExistente.id
    } else {
      const { data: novoProcesso } = await supabase
        .from('processos')
        .insert({ aluno_id: aluno.id, mentoria_id: aluno.mentoria_id, status: 'ativo', progresso: 0 })
        .select().single()
      processoId = novoProcesso?.id
    }

    // Salva alinhamento de expectativas
    await supabase.from('alinhamentos').insert({
      aluno_id: aluno.id,
      processo_id: processoId,
      nome, email, telefone,
      mentoria_escolhida: aluno.mentorias?.nome,
      motivacao, resultado_esperado, area_foco, grande_desafio,
      obstaculo, satisfacao_atual: parseInt(satisfacao_atual) || null,
      tentativas_anteriores, comprometimento, visao_ideal, info_adicional
    })

    // Também salva na ficha principal do aluno (para visualização rápida)
    await supabase.from('alunos').update({
      motivacao, resultado_esperado, area_foco, grande_desafio,
      obstaculo, satisfacao_atual: parseInt(satisfacao_atual) || null,
      tentativas_anteriores, comprometimento, visao_ideal, info_adicional,
      onboarding_concluido: true,
      onboarding_token: null // Invalida o token após uso
    }).eq('id', aluno.id)

    // Notifica mentor via push
    await fetch(`${req.headers.origin || process.env.VITE_APP_URL}/api/push-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: '00000000-0000-0000-0000-000000000001',
        title: 'Novo aluno no portal',
        body: `${nome} concluiu o cadastro — ${aluno.mentorias?.nome}`,
        tag: 'novo-aluno',
        url: '/'
      })
    }).catch(() => {})

    // Email de confirmação para o aluno
    await resend.emails.send({
      from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
      to: email,
      subject: 'Cadastro concluído — Portal de Mentoria',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f0ece4;border-radius:12px">
          <div style="font-family:Georgia,serif;font-size:24px;color:#c8a97a;margin-bottom:24px">Claudio Alecrim</div>
          <p style="font-size:15px;margin-bottom:16px">Olá, <strong>${nome}</strong>.</p>
          <p style="font-size:14px;color:#9a9590;margin-bottom:24px;line-height:1.6">
            Seu cadastro está completo. Você já pode acessar o portal com seu email e senha.
          </p>
          <div style="background:#171717;border-radius:10px;padding:16px;margin-bottom:24px;border:.5px solid rgba(200,169,122,.2)">
            <div style="font-size:11px;color:#5a5550;text-transform:uppercase;margin-bottom:4px">E-mail</div>
            <div style="font-size:14px;color:#f0ece4;margin-bottom:12px">${email}</div>
            <div style="font-size:11px;color:#5a5550;text-transform:uppercase;margin-bottom:4px">Mentoria</div>
            <div style="font-size:14px;color:#c8a97a">${aluno.mentorias?.nome}</div>
          </div>
          <a href="${process.env.VITE_APP_URL || 'https://portal-mentoria.vercel.app'}"
             style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:14px;border-radius:8px;text-align:center;font-weight:500;font-size:14px;margin-bottom:20px">
            Acessar o Portal →
          </a>
          <p style="font-size:12px;color:#5a5550;text-align:center">
            Em breve seu mentor entrará em contato para iniciar o processo.
          </p>
        </div>
      `
    }).catch(() => {})

    return res.status(200).json({ ok: true, email })
  }

  res.status(404).json({ error: 'Action não encontrada' })
}
