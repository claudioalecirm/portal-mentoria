// api/aluno.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MENTORIA_MESA = '10000000-0000-0000-0000-000000000003'

export default async function handler(req, res) {
  const { action, usuario_id } = req.query
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }

  // ─── DADOS COMPLETOS DO ALUNO ───
  if ((action === 'dados' || !action) && usuario_id) {
    // Busca TODAS as mentorias do aluno
    const { data: alunos } = await supabase
      .from('alunos')
      .select('*, mentorias(id, nome), usuarios(nome, email)')
      .eq('usuario_id', usuario_id)

    if (!alunos?.length) return res.status(404).json({ error: 'Aluno não encontrado' })

    // Aluno principal = primeira mentoria que NÃO é Mesa do Reino
    // Se só tem Mesa do Reino, usa ela
    const alunoPrincipal = alunos.find(a => a.mentoria_id !== MENTORIA_MESA) || alunos[0]
    const temMesa = alunos.some(a => a.mentoria_id === MENTORIA_MESA)

    // Busca dados do aluno principal
    const [enc, tar, msg, fer, ali] = await Promise.all([
      supabase.from('encontros').select('*').eq('aluno_id', alunoPrincipal.id).order('numero'),
      supabase.from('tarefas').select('*').eq('aluno_id', alunoPrincipal.id).order('criado_em', { ascending: false }),
      supabase.from('mensagens').select('*').eq('aluno_id', alunoPrincipal.id).order('criado_em'),
      supabase.from('ferramentas_aluno').select('*, ferramentas(id, nome, url)').eq('aluno_id', alunoPrincipal.id).eq('habilitada', true),
      supabase.from('alinhamentos').select('*').eq('aluno_id', alunoPrincipal.id).order('preenchido_em', { ascending: false }).limit(1).single()
    ])

    // Marca mensagens do mentor como lidas
    await supabase.from('mensagens')
      .update({ lida: true })
      .eq('aluno_id', alunoPrincipal.id)
      .eq('de', 'mentor')
      .eq('lida', false)

    return res.status(200).json({
      aluno: alunoPrincipal,
      encontros: enc.data || [],
      tarefas: tar.data || [],
      mensagens: msg.data || [],
      ferramentas: fer.data || [],
      alinhamento: ali.data || null,
      tem_mesa: temMesa,
      todas_mentorias: alunos
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
