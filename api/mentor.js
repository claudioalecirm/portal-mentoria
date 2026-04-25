// api/mentor.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const { action, aluno_id } = req.query

  // ─── OVERVIEW — lista todos os alunos ───
  if (action === 'overview' || !action) {
    const { data: alunos, error } = await supabase
      .from('alunos')
      .select(`
        id, progresso, acesso_ativo, onboarding_concluido,
        forma_pagamento, total_parcelas, pagamento_status, pagamento_aviso,
        criado_em,
        usuarios(id, nome, email),
        mentorias(id, nome)
      `)
      .order('criado_em', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ alunos: alunos || [] })
  }

  // ─── DADOS COMPLETOS DE UM ALUNO ───
  if (action === 'aluno' && aluno_id) {
    const { data: aluno, error } = await supabase
      .from('alunos')
      .select(`
        *,
        usuarios(id, nome, email),
        mentorias(id, nome)
      `)
      .eq('id', aluno_id)
      .single()

    if (error) return res.status(404).json({ error: 'Aluno não encontrado' })

    // Encontros
    const { data: encontros } = await supabase
      .from('encontros')
      .select('*')
      .eq('aluno_id', aluno_id)
      .order('numero')

    // Tarefas
    const { data: tarefas } = await supabase
      .from('tarefas')
      .select('*')
      .eq('aluno_id', aluno_id)
      .order('criado_em', { ascending: false })

    // Mensagens
    const { data: mensagens } = await supabase
      .from('mensagens')
      .select('*')
      .eq('aluno_id', aluno_id)
      .order('criado_em')

    // Ferramentas
    const { data: ferramentas } = await supabase
      .from('ferramentas_aluno')
      .select('*, ferramentas(id, nome, url)')
      .eq('aluno_id', aluno_id)

    // Parcelas
    const { data: parcelas } = await supabase
      .from('parcelas')
      .select('*')
      .eq('aluno_id', aluno_id)
      .order('numero')

    // Alinhamento
    const { data: alinhamento } = await supabase
      .from('alinhamentos')
      .select('*')
      .eq('aluno_id', aluno_id)
      .order('preenchido_em', { ascending: false })
      .limit(1)
      .single()

    return res.status(200).json({
      aluno, encontros: encontros || [],
      tarefas: tarefas || [], mensagens: mensagens || [],
      ferramentas: ferramentas || [], parcelas: parcelas || [],
      alinhamento: alinhamento || null
    })
  }

  // ─── ATUALIZAR ACESSO DO ALUNO ───
  if (action === 'acesso' && req.method === 'POST') {
    const { aluno_id: id, acesso_ativo } = req.body
    const { error } = await supabase
      .from('alunos').update({ acesso_ativo }).eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // ─── ATUALIZAR ENCONTRO ───
  if (action === 'encontro' && req.method === 'POST') {
    const { encontro_id, ...campos } = req.body
    const { error } = await supabase
      .from('encontros').update(campos).eq('id', encontro_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // ─── ADICIONAR TAREFA ───
  if (action === 'tarefa' && req.method === 'POST') {
    const { aluno_id: id, nome, tipo } = req.body
    const { data, error } = await supabase
      .from('tarefas').insert({ aluno_id: id, nome, tipo, concluida: false })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ tarefa: data })
  }

  // ─── ENVIAR MENSAGEM ───
  if (action === 'mensagem' && req.method === 'POST') {
    const { aluno_id: id, texto } = req.body
    const { data, error } = await supabase
      .from('mensagens').insert({ aluno_id: id, de: 'mentor', texto, lida: false })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ mensagem: data })
  }

  // ─── TOGGLE FERRAMENTA ───
  if (action === 'ferramenta' && req.method === 'POST') {
    const { aluno_id: id, ferramenta_id, habilitada } = req.body
    const { error } = await supabase
      .from('ferramentas_aluno').update({ habilitada })
      .eq('aluno_id', id).eq('ferramenta_id', ferramenta_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // ─── ADICIONAR ALUNO MANUALMENTE ───
  if (action === 'criar-aluno' && req.method === 'POST') {
    const { nome, email, senha, mentoria_id } = req.body
    if (!nome || !email || !senha || !mentoria_id) {
      return res.status(400).json({ error: 'Dados incompletos' })
    }

    // Verifica se já existe
    const { data: existe } = await supabase
      .from('usuarios').select('id').eq('email', email.toLowerCase().trim()).single()
    if (existe) return res.status(400).json({ error: 'Email já cadastrado' })

    const { data: novoUser } = await supabase
      .from('usuarios')
      .insert({ nome, email: email.toLowerCase().trim(), senha_hash: `aluno_hash_${senha}`, role: 'aluno', ativo: true })
      .select().single()

    const { data: novoAluno } = await supabase
      .from('alunos')
      .insert({ usuario_id: novoUser.id, mentoria_id, progresso: 0, acesso_ativo: true, onboarding_concluido: true })
      .select().single()

    // Processo
    const { data: proc } = await supabase
      .from('processos')
      .insert({ aluno_id: novoAluno.id, mentoria_id, status: 'ativo', progresso: 0 })
      .select().single()

    // Encontros
    const { data: templates } = await supabase
      .from('encontros_template').select('numero, nome').eq('mentoria_id', mentoria_id).order('numero')
    if (templates?.length) {
      await supabase.from('encontros').insert(
        templates.map((t, i) => ({ aluno_id: novoAluno.id, processo_id: proc.id, numero: t.numero, nome: t.nome, status: i === 0 ? 'nxt' : 'pend' }))
      )
    }

    // Ferramentas
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
