// api/aluno.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const { action, usuario_id } = req.query
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }

  // ─── DADOS COMPLETOS DO ALUNO ───
  if ((action === 'dados' || !action) && usuario_id) {
    const { data: aluno } = await supabase
      .from('alunos')
      .select('*, mentorias(id, nome), usuarios(nome, email)')
      .eq('usuario_id', usuario_id)
      .single()

    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' })

    const { data: encontros } = await supabase
      .from('encontros').select('*').eq('aluno_id', aluno.id).order('numero')

    const { data: tarefas } = await supabase
      .from('tarefas').select('*').eq('aluno_id', aluno.id).order('criado_em', { ascending: false })

    const { data: mensagens } = await supabase
      .from('mensagens').select('*').eq('aluno_id', aluno.id).order('criado_em')

    const { data: ferramentas } = await supabase
      .from('ferramentas_aluno')
      .select('*, ferramentas(id, nome, url)')
      .eq('aluno_id', aluno.id)
      .eq('habilitada', true)

    const { data: parcelas } = await supabase
      .from('parcelas').select('*').eq('aluno_id', aluno.id).order('numero')

    const { data: alinhamento } = await supabase
      .from('alinhamentos').select('*').eq('aluno_id', aluno.id)
      .order('preenchido_em', { ascending: false }).limit(1).single()

    // Marca mensagens do mentor como lidas
    await supabase.from('mensagens')
      .update({ lida: true })
      .eq('aluno_id', aluno.id)
      .eq('de', 'mentor')
      .eq('lida', false)

    return res.status(200).json({
      aluno, encontros: encontros || [],
      tarefas: tarefas || [], mensagens: mensagens || [],
      ferramentas: ferramentas || [], parcelas: parcelas || [],
      alinhamento: alinhamento || null
    })
  }

  // ─── CONCLUIR TAREFA ───
  if (action === 'concluir-tarefa' && req.method === 'POST') {
    const { tarefa_id, resposta } = body
    await supabase.from('tarefas')
      .update({ concluida: true, resposta, concluida_em: new Date().toISOString() })
      .eq('id', tarefa_id)
    return res.status(200).json({ ok: true })
  }

  // ─── ENVIAR MENSAGEM ───
  if (action === 'mensagem' && req.method === 'POST') {
    const { aluno_id, texto } = body
    const { data } = await supabase.from('mensagens')
      .insert({ aluno_id, de: 'aluno', texto, lida: false })
      .select().single()
    return res.status(200).json({ mensagem: data })
  }

  res.status(404).json({ error: 'Action não encontrada' })
}
