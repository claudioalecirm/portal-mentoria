// api/onboarding.js
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = 'https://dash.claudioalecrim.com.br'

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
    if (aluno.onboarding_concluido) {
      return res.status(400).json({ error: 'Este cadastro já foi concluído', ja_concluido: true })
    }

    return res.status(200).json({
      valido: true,
      nome: aluno.usuarios?.nome || '',
      email: aluno.usuarios?.email || '',
      mentoria: aluno.mentorias?.nome || '',
      aluno_id: aluno.id
    })
  }

  // ─── CADASTRAR ───
  if (req.method === 'POST' && action === 'cadastrar') {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }

    const {
      token, senha, nome_preferido,
      motivacao, resultado_esperado, area_foco, grande_desafio,
      obstaculo, satisfacao_atual, tentativas_anteriores,
      comprometimento, visao_ideal, info_adicional, telefone
    } = body

    if (!token || !senha) return res.status(400).json({ error: 'Dados incompletos' })
    if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter mínimo 6 caracteres' })

    const { data: aluno } = await supabase
      .from('alunos')
      .select('id, usuario_id, mentoria_id, onboarding_concluido, usuarios(nome, email), mentorias(nome)')
      .eq('onboarding_token', token)
      .single()

    if (!aluno) return res.status(404).json({ error: 'Token inválido' })
    if (aluno.onboarding_concluido) return res.status(400).json({ error: 'Cadastro já concluído' })

    const email = aluno.usuarios?.email
    const mentoriaNome = aluno.mentorias?.nome
    // Usa nome_preferido do formulário, senão usa o que já estava
    const nomeDefinitivo = nome_preferido?.trim() || aluno.usuarios?.nome || 'Aluno'

    // Atualiza nome do usuário com o nome que ele definiu
    await supabase.from('usuarios').update({
      nome: nomeDefinitivo,
      senha_hash: `aluno_hash_${senha}`
    }).eq('id', aluno.usuario_id)

    // Atualiza telefone
    if (telefone) {
      await supabase.from('alunos').update({ telefone }).eq('id', aluno.id)
    }

    // Busca ou cria processo
    let processoId = null
    const { data: processoExistente } = await supabase
      .from('processos').select('id')
      .eq('aluno_id', aluno.id).eq('mentoria_id', aluno.mentoria_id).eq('status', 'ativo')
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

    // Salva alinhamento
    await supabase.from('alinhamentos').insert({
      aluno_id: aluno.id, processo_id: processoId,
      nome: nomeDefinitivo, email, telefone, mentoria_escolhida: mentoriaNome,
      motivacao, resultado_esperado, area_foco, grande_desafio,
      obstaculo, satisfacao_atual: parseInt(satisfacao_atual) || null,
      tentativas_anteriores, comprometimento, visao_ideal, info_adicional
    })

    // Atualiza ficha do aluno
    await supabase.from('alunos').update({
      motivacao, resultado_esperado, area_foco, grande_desafio,
      obstaculo, satisfacao_atual: parseInt(satisfacao_atual) || null,
      tentativas_anteriores, comprometimento, visao_ideal, info_adicional,
      onboarding_concluido: true,
      onboarding_token: null
    }).eq('id', aluno.id)

    // Push para mentor
    await fetch(`${APP_URL}/api/push-send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: '00000000-0000-0000-0000-000000000001',
        title: 'Novo aluno no portal',
        body: `${nomeDefinitivo} concluiu o cadastro — ${mentoriaNome}`,
        tag: 'novo-aluno', url: '/'
      })
    }).catch(() => {})

    // Email de confirmação com link do portal
    await resend.emails.send({
      from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
      to: email,
      subject: 'Seu acesso ao Portal de Mentoria está pronto',
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f5f5f5">
        <div style="background:#0a0a0a;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
          <div style="font-family:Georgia,serif;font-size:26px;color:#c8a97a;font-weight:500">Claudio Alecrim</div>
          <div style="font-size:11px;color:#5a5550;letter-spacing:.2em;text-transform:uppercase;margin-top:4px">Portal de Mentoria</div>
        </div>
        <div style="background:#fff;padding:36px 40px">
          <p style="font-size:16px;color:#111;margin-bottom:12px">Olá, <strong>${nomeDefinitivo}</strong>!</p>
          <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:24px">
            Seu cadastro na <strong style="color:#c8a97a">${mentoriaNome}</strong> está completo. Acesse o portal quando quiser:
          </p>
          <a href="${APP_URL}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:16px;border-radius:8px;text-align:center;font-weight:600;font-size:15px;margin-bottom:20px">
            Acessar o Portal →
          </a>
          <div style="background:#fafafa;border-radius:8px;padding:14px 18px">
            <div style="font-size:12px;color:#888;margin-bottom:4px">Salve este endereço nos seus favoritos:</div>
            <a href="${APP_URL}" style="color:#c8a97a;font-size:14px;font-weight:500;text-decoration:none">dash.claudioalecrim.com.br</a>
          </div>
        </div>
        <div style="background:#0a0a0a;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center">
          <p style="font-size:11px;color:#5a5550;margin:0">© Claudio Alecrim · claudioalecrim.com.br</p>
        </div>
      </div>`
    }).catch(() => {})

    return res.status(200).json({ ok: true, email, nome: nomeDefinitivo })
  }

  res.status(404).json({ error: 'Action não encontrada' })
}
