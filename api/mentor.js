// api/mentor.js — com alias aluno-dados para compatibilidade com DashMentor.jsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }

  const action = req.query.action
  const aluno_id = req.query.aluno_id || body?.aluno_id

  // ─── OVERVIEW ───
  if (action === 'overview') {
    const { data: alunos } = await supabase
      .from('alunos')
      .select('id, progresso, acesso_ativo, pagamento_status, pagamento_aviso, forma_pagamento, criado_em, usuarios(id,nome,email), mentorias(id,nome)')
      .order('criado_em', { ascending: false })
    const { data: msgs } = await supabase.from('mensagens').select('id').eq('lida', false).eq('de', 'aluno')
    const { data: tasks } = await supabase.from('tarefas').select('id').eq('concluida', false)
    return res.status(200).json({ alunos: alunos || [], mensagensNaoLidas: msgs || [], tarefasPendentes: tasks || [] })
  }

  // ─── MENTORIAS ───
  if (action === 'mentorias') {
    const { data: mentorias } = await supabase
      .from('mentorias')
      .select('id, nome, ativo, encontros_template(id, numero, nome)')
      .order('nome')
    const result = await Promise.all((mentorias || []).map(async m => {
      const { data: alunos } = await supabase.from('alunos').select('id, usuarios(nome)').eq('mentoria_id', m.id)
      return { ...m, alunos: alunos || [] }
    }))
    return res.status(200).json({ mentorias: result })
  }

  // ─── FERRAMENTAS GLOBAIS ───
  if (action === 'ferramentas') {
    const { data } = await supabase.from('ferramentas').select('*').order('nome')
    return res.status(200).json({ ferramentas: data || [] })
  }

  // ─── DADOS DO ALUNO — suporta tanto 'aluno' quanto 'aluno-dados' ───
  if ((action === 'aluno' || action === 'aluno-dados') && aluno_id) {
    const { data: aluno } = await supabase
      .from('alunos').select('*, usuarios(id,nome,email), mentorias(id,nome)')
      .eq('id', aluno_id).single()
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' })

    const [enc, tar, msg, fer, par, ali] = await Promise.all([
      supabase.from('encontros').select('*').eq('aluno_id', aluno_id).order('numero'),
      supabase.from('tarefas').select('*').eq('aluno_id', aluno_id).order('criado_em', { ascending: false }),
      supabase.from('mensagens').select('*').eq('aluno_id', aluno_id).order('criado_em'),
      supabase.from('ferramentas_aluno').select('*, ferramentas(id,nome,url)').eq('aluno_id', aluno_id),
      supabase.from('parcelas').select('*').eq('aluno_id', aluno_id).order('numero'),
      supabase.from('alinhamentos').select('*').eq('aluno_id', aluno_id).order('preenchido_em', { ascending: false }).limit(1).single()
    ])

    return res.status(200).json({
      aluno, encontros: enc.data || [], tarefas: tar.data || [],
      mensagens: msg.data || [], ferramentas: fer.data || [],
      parcelas: par.data || [], alinhamento: ali.data || null
    })
  }

  // ─── PROGRESSO ───
  if (action === 'progresso' && req.method === 'POST') {
    const { aluno_id: id, progresso } = body
    await supabase.from('alunos').update({ progresso }).eq('id', id)
    return res.status(200).json({ ok: true })
  }

  // ─── ACESSO ───
  if (action === 'acesso' && req.method === 'POST') {
    const { aluno_id: id, ativo } = body
    await supabase.from('alunos').update({ acesso_ativo: ativo }).eq('id', id)
    return res.status(200).json({ ok: true })
  }

  // ─── SALVAR ENCONTRO ───
  if (action === 'encontro-salvar' && req.method === 'POST') {
    const { encontro_id, resumo, ferramentas_aplicadas, tarefas_texto,
      proximo_nome, proximo_data, proximo_hora, proximo_modalidade,
      proximo_link, proximo_endereco } = body
    await supabase.from('encontros').update({
      resumo, ferramentas: ferramentas_aplicadas, tarefas_texto,
      proximo_nome, proximo_data: proximo_data || null,
      proximo_hora, proximo_modalidade, proximo_link, proximo_endereco,
      status: 'done'
    }).eq('id', encontro_id)
    // Avança próximo encontro para 'nxt'
    const { data: enc } = await supabase.from('encontros').select('numero, aluno_id').eq('id', encontro_id).single()
    if (enc) {
      const { data: prox } = await supabase.from('encontros')
        .select('id').eq('aluno_id', enc.aluno_id).eq('numero', enc.numero + 1).single()
      if (prox) await supabase.from('encontros').update({ status: 'nxt' }).eq('id', prox.id)
    }
    return res.status(200).json({ ok: true })
  }

  // ─── ADICIONAR TAREFA ───
  if (action === 'tarefa-adicionar' && req.method === 'POST') {
    const { aluno_id: id, nome, tipo } = body
    const { data } = await supabase.from('tarefas').insert({ aluno_id: id, nome, tipo, concluida: false }).select().single()
    return res.status(200).json({ tarefa: data })
  }

  // ─── TOGGLE FERRAMENTA INDIVIDUAL ───
  if (action === 'ferramenta-toggle' && req.method === 'POST') {
    const { aluno_id: id, ferramenta_id, habilitada } = body
    await supabase.from('ferramentas_aluno').update({ habilitada }).eq('aluno_id', id).eq('ferramenta_id', ferramenta_id)
    return res.status(200).json({ ok: true })
  }

  // ─── TOGGLE FERRAMENTA GLOBAL ───
  if (action === 'ferramenta-global' && req.method === 'POST') {
    const { ferramenta_id, ativo } = body
    await supabase.from('ferramentas').update({ ativo_global: ativo }).eq('id', ferramenta_id)
    return res.status(200).json({ ok: true })
  }

  // ─── CRIAR MENTORIA ───
  if (action === 'mentoria-criar' && req.method === 'POST') {
    const { nome, encontros } = body
    const { data: nova } = await supabase.from('mentorias').insert({ nome, ativo: true }).select().single()
    if (nova && encontros?.length) {
      await supabase.from('encontros_template').insert(
        encontros.map((n, i) => ({ mentoria_id: nova.id, numero: i + 1, nome: n || `Encontro ${i + 1}` }))
      )
    }
    return res.status(200).json({ ok: true, mentoria_id: nova?.id })
  }

  // ─── EXCLUIR MENTORIA ───
  if (action === 'mentoria-excluir' && req.method === 'DELETE') {
    const { mentoria_id } = body
    await supabase.from('encontros_template').delete().eq('mentoria_id', mentoria_id)
    await supabase.from('mentorias').delete().eq('id', mentoria_id)
    return res.status(200).json({ ok: true })
  }

  // ─── CRIAR ALUNO MANUALMENTE ───
  if (action === 'criar-aluno' && req.method === 'POST') {
    const { nome, email, senha, mentoria_id } = body
    if (!nome || !email || !senha || !mentoria_id) return res.status(400).json({ error: 'Dados incompletos' })
    const { data: existe } = await supabase.from('usuarios').select('id').eq('email', email.toLowerCase().trim()).single()
    if (existe) return res.status(400).json({ error: 'Email já cadastrado' })
    const { data: novoUser } = await supabase.from('usuarios')
      .insert({ nome, email: email.toLowerCase().trim(), senha_hash: `aluno_hash_${senha}`, role: 'aluno', ativo: true })
      .select().single()
    const { data: novoAluno } = await supabase.from('alunos')
      .insert({ usuario_id: novoUser.id, mentoria_id, progresso: 0, acesso_ativo: true, onboarding_concluido: true })
      .select().single()
    const { data: proc } = await supabase.from('processos')
      .insert({ aluno_id: novoAluno.id, mentoria_id, status: 'ativo', progresso: 0 })
      .select().single()
    const { data: templates } = await supabase.from('encontros_template').select('numero, nome').eq('mentoria_id', mentoria_id).order('numero')
    if (templates?.length) {
      await supabase.from('encontros').insert(
        templates.map((t, i) => ({ aluno_id: novoAluno.id, processo_id: proc.id, numero: t.numero, nome: t.nome, status: i === 0 ? 'nxt' : 'pend' }))
      )
    }
    const { data: ferramentas } = await supabase.from('ferramentas').select('id, ativo_global')
    if (ferramentas?.length) {
      await supabase.from('ferramentas_aluno').insert(
        ferramentas.map(f => ({ aluno_id: novoAluno.id, ferramenta_id: f.id, habilitada: f.ativo_global }))
      )
    }
    return res.status(200).json({ ok: true, aluno_id: novoAluno.id })
  }

  res.status(404).json({ error: 'Action não encontrada' })
}
