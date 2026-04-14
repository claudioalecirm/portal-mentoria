// api/mentor.js — rotas CRUD do mentor
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const { action } = req.query

  // ─── GET visão geral ───
  if (req.method === 'GET' && action === 'overview') {
    const { data: alunos } = await supabase
      .from('alunos')
      .select('id, progresso, acesso_ativo, usuarios(nome, email), mentorias(nome)')
    const { data: mensagensNaoLidas } = await supabase
      .from('mensagens')
      .select('aluno_id')
      .eq('de', 'aluno')
      .eq('lida', false)
    const { data: tarefasPendentes } = await supabase
      .from('tarefas')
      .select('aluno_id')
      .eq('concluida', false)
    return res.status(200).json({ alunos, mensagensNaoLidas, tarefasPendentes })
  }

  // ─── GET dados completos de um aluno ───
  if (req.method === 'GET' && action === 'aluno-dados') {
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

  // ─── POST atualizar progresso ───
  if (req.method === 'POST' && action === 'progresso') {
    const { aluno_id, progresso } = req.body
    const { error } = await supabase.from('alunos').update({ progresso }).eq('id', aluno_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // ─── POST toggle acesso ───
  if (req.method === 'POST' && action === 'acesso') {
    const { aluno_id, ativo } = req.body
    const { error } = await supabase.from('alunos').update({ acesso_ativo: ativo }).eq('id', aluno_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // ─── POST salvar encontro + agendar próximo ───
  if (req.method === 'POST' && action === 'encontro-salvar') {
    const { encontro_id, aluno_id, resumo, ferramentas_aplicadas, tarefas_texto,
            proximo_nome, proximo_data, proximo_hora, proximo_modalidade, proximo_link, proximo_endereco } = req.body

    const { error } = await supabase.from('encontros').update({
      status: 'done', resumo, ferramentas: ferramentas_aplicadas, tarefas_texto,
      proximo_nome, proximo_data, proximo_hora, proximo_modalidade, proximo_link, proximo_endereco
    }).eq('id', encontro_id)
    if (error) return res.status(500).json({ error: error.message })

    // Atualiza status do próximo encontro para 'nxt'
    const { data: enc } = await supabase.from('encontros').select('numero').eq('id', encontro_id).single()
    if (enc) {
      await supabase.from('encontros')
        .update({ status: 'nxt', nome: proximo_nome })
        .eq('aluno_id', aluno_id)
        .eq('numero', enc.numero + 1)
    }

    // Push para o aluno
    const { data: alunoInfo } = await supabase.from('alunos').select('usuario_id').eq('id', aluno_id).single()
    if (alunoInfo && proximo_data) {
      const dtFmt = new Date(proximo_data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      await fetch(`${req.headers.origin}/api/push-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: alunoInfo.usuario_id,
          title: 'Próximo encontro agendado',
          body: `${proximo_nome} · ${dtFmt} às ${proximo_hora}`,
          tag: 'encontro-agendado',
          url: '/'
        })
      }).catch(() => {})
    }
    return res.status(200).json({ ok: true })
  }

  // ─── POST adicionar tarefa ───
  if (req.method === 'POST' && action === 'tarefa-adicionar') {
    const { aluno_id, nome, tipo, arquivo_url } = req.body
    const { data, error } = await supabase.from('tarefas').insert({ aluno_id, nome, tipo, arquivo_url }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true, tarefa: data })
  }

  // ─── POST toggle ferramenta do aluno ───
  if (req.method === 'POST' && action === 'ferramenta-toggle') {
    const { aluno_id, ferramenta_id, habilitada } = req.body
    const { error } = await supabase.from('ferramentas_aluno')
      .upsert({ aluno_id, ferramenta_id, habilitada }, { onConflict: 'aluno_id,ferramenta_id' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // ─── POST criar mentoria ───
  if (req.method === 'POST' && action === 'mentoria-criar') {
    const { nome, encontros } = req.body
    const { data: mentoria, error } = await supabase.from('mentorias').insert({ nome }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    const templates = encontros.map((n, i) => ({ mentoria_id: mentoria.id, numero: i + 1, nome: n }))
    await supabase.from('encontros_template').insert(templates)
    return res.status(200).json({ ok: true, mentoria })
  }

  // ─── DELETE excluir mentoria ───
  if (req.method === 'DELETE' && action === 'mentoria-excluir') {
    const { mentoria_id } = req.body
    const { error } = await supabase.from('mentorias').delete().eq('id', mentoria_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // ─── GET mentorias com encontros ───
  if (req.method === 'GET' && action === 'mentorias') {
    const { data } = await supabase
      .from('mentorias')
      .select('*, encontros_template(numero, nome), alunos(id, usuarios(nome))')
      .order('criado_em')
    return res.status(200).json({ mentorias: data })
  }

  // ─── GET todas as ferramentas ───
  if (req.method === 'GET' && action === 'ferramentas') {
    const { data } = await supabase.from('ferramentas').select('*').order('nome')
    return res.status(200).json({ ferramentas: data })
  }

  // ─── POST toggle ferramenta global ───
  if (req.method === 'POST' && action === 'ferramenta-global') {
    const { ferramenta_id, ativo } = req.body
    const { error } = await supabase.from('ferramentas').update({ ativo_global: ativo }).eq('id', ferramenta_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(404).json({ error: 'Action não encontrada' })
}
