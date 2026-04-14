// api/aluno.js — rotas CRUD do aluno
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const { action } = req.query

  // ─── GET dados completos do aluno ───
  if (req.method === 'GET' && action === 'dados') {
    const { aluno_id } = req.query
    const [
      { data: aluno },
      { data: encontros },
      { data: tarefas },
      { data: mensagens },
      { data: parcelas },
      { data: ferramentas }
    ] = await Promise.all([
      supabase.from('alunos').select('*, usuarios(nome,email), mentorias(nome)').eq('id', aluno_id).single(),
      supabase.from('encontros').select('*').eq('aluno_id', aluno_id).order('numero'),
      supabase.from('tarefas').select('*').eq('aluno_id', aluno_id).order('criado_em'),
      supabase.from('mensagens').select('*').eq('aluno_id', aluno_id).order('criado_em'),
      supabase.from('parcelas').select('*').eq('aluno_id', aluno_id).order('numero'),
      supabase.from('ferramentas_aluno').select('*, ferramentas(*)').eq('aluno_id', aluno_id)
    ])
    return res.status(200).json({ aluno, encontros, tarefas, mensagens, parcelas, ferramentas })
  }

  // ─── POST concluir tarefa ───
  if (req.method === 'POST' && action === 'tarefa-concluir') {
    const { tarefa_id, resposta } = req.body
    const { data, error } = await supabase
      .from('tarefas')
      .update({ concluida: true, resposta, concluida_em: new Date().toISOString() })
      .eq('id', tarefa_id)
      .select('*, alunos(usuario_id, usuarios(nome))')
      .single()
    if (error) return res.status(500).json({ error: error.message })

    // Dispara push para o mentor
    const alunoNome = data.alunos?.usuarios?.nome || 'Aluno'
    const mentorId = '00000000-0000-0000-0000-000000000001'
    await fetch(`${req.headers.origin}/api/push-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: mentorId,
        title: `${alunoNome} concluiu uma tarefa`,
        body: `"${data.nome}"`,
        tag: 'tarefa-concluida',
        url: '/'
      })
    }).catch(() => {})

    return res.status(200).json({ ok: true, tarefa: data })
  }

  // ─── POST enviar mensagem ───
  if (req.method === 'POST' && action === 'mensagem-enviar') {
    const { aluno_id, de, texto } = req.body
    const { data, error } = await supabase
      .from('mensagens')
      .insert({ aluno_id, de, texto })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })

    // Push para mentor (se aluno enviou) ou para aluno (se mentor respondeu)
    const mentorId = '00000000-0000-0000-0000-000000000001'
    if (de === 'aluno') {
      const { data: alunoInfo } = await supabase
        .from('alunos')
        .select('usuarios(nome)')
        .eq('id', aluno_id)
        .single()
      const nome = alunoInfo?.usuarios?.nome || 'Aluno'
      await fetch(`${req.headers.origin}/api/push-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: mentorId, title: `Mensagem de ${nome}`, body: texto, tag: 'mensagem', url: '/' })
      }).catch(() => {})
    } else {
      const { data: alunoInfo } = await supabase
        .from('alunos')
        .select('usuario_id')
        .eq('id', aluno_id)
        .single()
      if (alunoInfo) {
        await fetch(`${req.headers.origin}/api/push-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: alunoInfo.usuario_id, title: 'Claudio Alecrim respondeu', body: texto, tag: 'mensagem', url: '/' })
        }).catch(() => {})
      }
    }
    return res.status(200).json({ ok: true, mensagem: data })
  }

  // ─── POST marcar mensagens como lidas ───
  if (req.method === 'POST' && action === 'mensagens-lidas') {
    const { aluno_id, de } = req.body
    await supabase.from('mensagens').update({ lida: true }).eq('aluno_id', aluno_id).eq('de', de)
    return res.status(200).json({ ok: true })
  }

  res.status(404).json({ error: 'Action não encontrada' })
}
