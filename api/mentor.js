// api/mentor.js — com Mesa do Reino, sem financeiro Asaas
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MESA_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const MENTORIA_MESA = '10000000-0000-0000-0000-000000000003'

export default async function handler(req, res) {
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const action = req.query.action
  const aluno_id = req.query.aluno_id || body?.aluno_id

  // ─── OVERVIEW ───
  if (action === 'overview') {
    const { data: alunos } = await supabase
      .from('alunos')
      .select('id, progresso, acesso_ativo, pagamento_status, criado_em, usuarios(id,nome,email), mentorias(id,nome)')
      .order('criado_em', { ascending: false })
    const { data: msgs } = await supabase.from('mensagens').select('id').eq('lida', false).eq('de', 'aluno')
    const { data: tasks } = await supabase.from('tarefas').select('id').eq('concluida', false)
    return res.status(200).json({ alunos: alunos || [], mensagensNaoLidas: msgs || [], tarefasPendentes: tasks || [] })
  }

  // ─── MENTORIAS ───
  if (action === 'mentorias') {
    const { data: mentorias } = await supabase
      .from('mentorias').select('id, nome, ativo, encontros_template(id, numero, nome)').order('nome')
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

  // ─── DADOS DO ALUNO ───
  if ((action === 'aluno' || action === 'aluno-dados') && aluno_id) {
    const { data: aluno } = await supabase
      .from('alunos').select('*, usuarios(id,nome,email), mentorias(id,nome)')
      .eq('id', aluno_id).single()
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' })

    const [enc, tar, msg, fer, ali] = await Promise.all([
      supabase.from('encontros').select('*').eq('aluno_id', aluno_id).order('numero'),
      supabase.from('tarefas').select('*').eq('aluno_id', aluno_id).order('criado_em', { ascending: false }),
      supabase.from('mensagens').select('*').eq('aluno_id', aluno_id).order('criado_em'),
      supabase.from('ferramentas_aluno').select('*, ferramentas(id,nome,url)').eq('aluno_id', aluno_id),
      supabase.from('alinhamentos').select('*').eq('aluno_id', aluno_id).order('preenchido_em', { ascending: false }).limit(1).single()
    ])

    return res.status(200).json({
      aluno, encontros: enc.data || [], tarefas: tar.data || [],
      mensagens: msg.data || [], ferramentas: fer.data || [],
      alinhamento: ali.data || null
    })
  }

  // ─── PROGRESSO ───
  if (action === 'progresso' && req.method === 'POST') {
    await supabase.from('alunos').update({ progresso: body.progresso }).eq('id', body.aluno_id)
    return res.status(200).json({ ok: true })
  }

  // ─── ACESSO ───
  if (action === 'acesso' && req.method === 'POST') {
    await supabase.from('alunos').update({ acesso_ativo: body.ativo }).eq('id', body.aluno_id)
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
      proximo_hora, proximo_modalidade, proximo_link, proximo_endereco, status: 'done'
    }).eq('id', encontro_id)
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
    const { data } = await supabase.from('tarefas')
      .insert({ aluno_id: body.aluno_id, nome: body.nome, tipo: body.tipo, concluida: false }).select().single()
    return res.status(200).json({ tarefa: data })
  }

  // ─── FERRAMENTA TOGGLE INDIVIDUAL ───
  if (action === 'ferramenta-toggle' && req.method === 'POST') {
    await supabase.from('ferramentas_aluno').update({ habilitada: body.habilitada })
      .eq('aluno_id', body.aluno_id).eq('ferramenta_id', body.ferramenta_id)
    return res.status(200).json({ ok: true })
  }

  // ─── FERRAMENTA GLOBAL ───
  if (action === 'ferramenta-global' && req.method === 'POST') {
    await supabase.from('ferramentas').update({ ativo_global: body.ativo }).eq('id', body.ferramenta_id)
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
    await supabase.from('encontros_template').delete().eq('mentoria_id', body.mentoria_id)
    await supabase.from('mentorias').delete().eq('id', body.mentoria_id)
    return res.status(200).json({ ok: true })
  }

  // ─── SALVAR MÓDULOS DA MENTORIA + propaga para alunos ativos ───
  if (action === 'mentoria-modulos-salvar' && req.method === 'POST') {
    const { mentoria_id, modulos } = body
    const novos = modulos.map((m, i) => ({ ...m, numero: i + 1, nome: m.nome || `Módulo ${i + 1}` }))
    await supabase.from('encontros_template').delete().eq('mentoria_id', mentoria_id)
    if (novos.length) {
      await supabase.from('encontros_template').insert(novos.map(m => ({ mentoria_id, numero: m.numero, nome: m.nome })))
    }
    const { data: alunos } = await supabase.from('alunos').select('id').eq('mentoria_id', mentoria_id).eq('acesso_ativo', true)
    if (alunos?.length) {
      for (const aluno of alunos) {
        const { data: encAtual } = await supabase.from('encontros').select('id, numero, status').eq('aluno_id', aluno.id)
        const encMap = {}
        for (const e of (encAtual || [])) encMap[e.numero] = e
        for (const mod of novos) {
          const enc = encMap[mod.numero]
          if (enc) {
            if (enc.status !== 'done') await supabase.from('encontros').update({ nome: mod.nome }).eq('id', enc.id)
          } else {
            await supabase.from('encontros').insert({ aluno_id: aluno.id, numero: mod.numero, nome: mod.nome, status: 'pend' })
          }
        }
        const numerosNovos = new Set(novos.map(m => m.numero))
        for (const e of (encAtual || [])) {
          if (!numerosNovos.has(e.numero) && e.status === 'pend') {
            await supabase.from('encontros').delete().eq('id', e.id)
          }
        }
      }
    }
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
      .insert({ aluno_id: novoAluno.id, mentoria_id, status: 'ativo', progresso: 0 }).select().single()
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

    // Se não é Mesa do Reino, dá acesso à Mesa do Reino como bônus
    if (mentoria_id !== MENTORIA_MESA) {
      await supabase.from('alunos').insert({
        usuario_id: novoUser.id, mentoria_id: MENTORIA_MESA,
        progresso: 0, acesso_ativo: true, onboarding_concluido: true
      }).select().single()
    }

    return res.status(200).json({ ok: true, aluno_id: novoAluno.id })
  }

  // ─── MESA DO REINO — LER CONFIG ───
  if (action === 'mesa-config') {
    const { data } = await supabase.from('mesa_reino_config').select('*').eq('id', MESA_ID).single()
    // Verifica se link expirou (2 horas)
    if (data?.link_definido_em) {
      const diff = Date.now() - new Date(data.link_definido_em).getTime()
      if (diff > 2 * 60 * 60 * 1000) {
        await supabase.from('mesa_reino_config').update({ link_zoom: null, link_definido_em: null }).eq('id', MESA_ID)
        return res.status(200).json({ link_zoom: null, expirado: true })
      }
    }
    return res.status(200).json({ link_zoom: data?.link_zoom || null, link_definido_em: data?.link_definido_em || null })
  }

  // ─── MESA DO REINO — SALVAR LINK ───
  if (action === 'mesa-salvar' && req.method === 'POST') {
    await supabase.from('mesa_reino_config').update({
      link_zoom: body.link_zoom,
      link_definido_em: new Date().toISOString()
    }).eq('id', MESA_ID)
    return res.status(200).json({ ok: true })
  }

  // ─── MESA DO REINO — LIMPAR LINK ───
  if (action === 'mesa-limpar' && req.method === 'POST') {
    await supabase.from('mesa_reino_config').update({ link_zoom: null, link_definido_em: null }).eq('id', MESA_ID)
    return res.status(200).json({ ok: true })
  }

  res.status(404).json({ error: 'Action não encontrada' })
}
