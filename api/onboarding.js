// api/onboarding.js
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { emailAcessoPortal } from './email-templates.js'

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

  // ─── CADASTRAR (alinhamento + senha) ───
  if (req.method === 'POST' && action === 'cadastrar') {
    const {
      token, senha,
      motivacao, resultado_esperado, area_foco, grande_desafio,
      obstaculo, satisfacao_atual, tentativas_anteriores,
      comprometimento, visao_ideal, info_adicional, telefone
    } = req.body

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
    const nome = aluno.usuarios?.nome
    const mentoriaNome = aluno.mentorias?.nome

    // Define senha
    const senhaHash = `aluno_hash_${senha}`
    await supabase.from('usuarios').update({ senha_hash: senhaHash }).eq('id', aluno.usuario_id)

    // Atualiza telefone
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

    // Salva alinhamento
    await supabase.from('alinhamentos').insert({
      aluno_id: aluno.id,
      processo_id: processoId,
      nome, email, telefone,
      mentoria_escolhida: mentoriaNome,
      motivacao, resultado_esperado, area_foco, grande_desafio,
      obstaculo, satisfacao_atual: parseInt(satisfacao_atual) || null,
      tentativas_anteriores, comprometimento, visao_ideal, info_adicional
    })

    // Salva na ficha principal do aluno
    await supabase.from('alunos').update({
      motivacao, resultado_esperado, area_foco, grande_desafio,
      obstaculo, satisfacao_atual: parseInt(satisfacao_atual) || null,
      tentativas_anteriores, comprometimento, visao_ideal, info_adicional,
      onboarding_concluido: true,
      onboarding_token: null
    }).eq('id', aluno.id)

    // Push para o mentor
    const appUrl = process.env.VITE_APP_URL || 'https://portal-mentoria.vercel.app'
    await fetch(`${appUrl}/api/push-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: '00000000-0000-0000-0000-000000000001',
        title: 'Novo aluno no portal',
        body: `${nome} concluiu o cadastro — ${mentoriaNome}`,
        tag: 'novo-aluno',
        url: '/'
      })
    }).catch(() => {})

    // Email de confirmação com link do portal e instruções de acesso
    const { subject, html } = emailAcessoPortal(nome, mentoriaNome)
    await resend.emails.send({
      from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
      to: email,
      subject,
      html
    }).catch(() => {})

    return res.status(200).json({ ok: true, email })
  }

  res.status(404).json({ error: 'Action não encontrada' })
}
