import { useState, useEffect } from 'react'
import Mensagens from '../components/Mensagens.jsx'

const TABS_MENTOR = ['Visão Geral', 'Mentorias', 'Ferramentas', 'Alunos', 'Mesa do Reino']
const TABS_ALUNO = ['Controle', 'Ficha', 'Encontros', 'Tarefas', 'Mensagens']
const MENTORIA_MESA = '10000000-0000-0000-0000-000000000003'

export default function DashMentor({ user, onLogout, showPush }) {
  const [tab, setTab] = useState(0)
  const [overview, setOverview] = useState(null)
  const [mentorias, setMentorias] = useState([])
  const [ferramentasGlobal, setFerramentasGlobal] = useState([])
  const [alunoAtivo, setAlunoAtivo] = useState(null)
  const [alunoTab, setAlunoTab] = useState(0)
  const [alunoData, setAlunoData] = useState(null)
  const [editEnc, setEditEnc] = useState(null)
  const [modSel, setModSel] = useState('online')
  const [mentoriaDetalhe, setMentoriaDetalhe] = useState(null)
  const [editandoModulos, setEditandoModulos] = useState(false)
  const [modulosEdit, setModulosEdit] = useState([])
  const [msgDot, setMsgDot] = useState(false)
  const [novaMentoriaNome, setNovaMentoriaNome] = useState('')
  const [novaMentoriaQtd, setNovaMentoriaQtd] = useState('')
  const [novaMentoriaEncs, setNovaMentoriaEncs] = useState([])
  const [taskNome, setTaskNome] = useState('')
  const [taskTipo, setTaskTipo] = useState('texto')
  const [busca, setBusca] = useState('')
  const [pctLocal, setPctLocal] = useState(0)
  const [savingEnc, setSavingEnc] = useState(false)
  // Mesa do Reino
  const [mesaLink, setMesaLink] = useState('')
  const [mesaLinkSalvo, setMesaLinkSalvo] = useState(null)
  const [mesaDefinidoEm, setMesaDefinidoEm] = useState(null)
  const [mesaSalvando, setMesaSalvando] = useState(false)

  const carregarOverview = async () => {
    try {
      const [ovRes, mRes, fRes] = await Promise.all([
        fetch('/api/mentor?action=overview'),
        fetch('/api/mentor?action=mentorias'),
        fetch('/api/mentor?action=ferramentas')
      ])
      const [ov, m, f] = await Promise.all([ovRes.json(), mRes.json(), fRes.json()])
      setOverview(ov)
      setMentorias(m.mentorias || [])
      setFerramentasGlobal(f.ferramentas || [])
      setMsgDot((ov.mensagensNaoLidas || []).length > 0)
    } catch {}
  }

  const carregarMesa = async () => {
    try {
      const r = await fetch('/api/mentor?action=mesa-config')
      const d = await r.json()
      setMesaLinkSalvo(d.link_zoom || null)
      setMesaDefinidoEm(d.link_definido_em || null)
    } catch {}
  }

  const carregarAluno = async (aluno_id) => {
    try {
      const res = await fetch(`/api/mentor?action=aluno-dados&aluno_id=${aluno_id}`)
      const data = await res.json()
      setAlunoData(data)
      setPctLocal(data.aluno?.progresso || 0)
    } catch {}
  }

  useEffect(() => { carregarOverview() }, [])
  useEffect(() => { if (tab === 4) carregarMesa() }, [tab])

  const abrirAluno = async (aluno) => {
    setAlunoAtivo(aluno)
    setAlunoTab(0)
    setEditEnc(null)
    await carregarAluno(aluno.id)
  }

  const salvarProgresso = async (v) => {
    await fetch('/api/mentor?action=progresso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aluno_id: alunoAtivo.id, progresso: v }) })
  }

  const toggleAcesso = async () => {
    const novoAtivo = !alunoData?.aluno?.acesso_ativo
    await fetch('/api/mentor?action=acesso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aluno_id: alunoAtivo.id, ativo: novoAtivo }) })
    carregarAluno(alunoAtivo.id)
  }

  const salvarEncontro = async () => {
    if (!editEnc) return
    setSavingEnc(true)
    await fetch('/api/mentor?action=encontro-salvar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encontro_id: editEnc.id, aluno_id: alunoAtivo.id, resumo: editEnc.resumo, ferramentas_aplicadas: editEnc.ferramentas, tarefas_texto: editEnc.tarefas_texto, proximo_nome: editEnc.proximo_nome, proximo_data: editEnc.proximo_data, proximo_hora: editEnc.proximo_hora, proximo_modalidade: modSel, proximo_link: editEnc.proximo_link, proximo_endereco: editEnc.proximo_endereco })
    })
    setSavingEnc(false); setEditEnc(null)
    carregarAluno(alunoAtivo.id)
    if (editEnc.proximo_data) {
      const dtFmt = new Date(editEnc.proximo_data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      showPush('Encontro salvo', `Aluno notificado: ${editEnc.proximo_nome} · ${dtFmt}`)
    }
  }

  const adicionarTarefa = async () => {
    if (!taskNome.trim()) return
    await fetch('/api/mentor?action=tarefa-adicionar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aluno_id: alunoAtivo.id, nome: taskNome, tipo: taskTipo }) })
    setTaskNome(''); carregarAluno(alunoAtivo.id)
  }

  const toggleFerramenta = async (fa) => {
    await fetch('/api/mentor?action=ferramenta-toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aluno_id: alunoAtivo.id, ferramenta_id: fa.ferramenta_id || fa.ferramentas?.id, habilitada: !fa.habilitada }) })
    carregarAluno(alunoAtivo.id)
  }

  const toggleFerramentaGlobal = async (f) => {
    await fetch('/api/mentor?action=ferramenta-global', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ferramenta_id: f.id, ativo: !f.ativo_global }) })
    carregarOverview()
  }

  const criarMentoria = async () => {
    if (!novaMentoriaNome.trim() || novaMentoriaEncs.length === 0) return
    await fetch('/api/mentor?action=mentoria-criar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novaMentoriaNome, encontros: novaMentoriaEncs.map(e => e.nome) }) })
    setNovaMentoriaNome(''); setNovaMentoriaQtd(''); setNovaMentoriaEncs([])
    carregarOverview()
  }

  const excluirMentoria = async (id) => {
    if (!confirm('Excluir esta mentoria?')) return
    await fetch('/api/mentor?action=mentoria-excluir', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mentoria_id: id }) })
    setMentoriaDetalhe(null); carregarOverview()
  }

  const salvarModulos = async () => {
    await fetch('/api/mentor?action=mentoria-modulos-salvar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mentoria_id: mentoriaDetalhe.id, modulos: modulosEdit }) })
    setEditandoModulos(false); await carregarOverview()
    setMentoriaDetalhe(prev => ({ ...prev, encontros_template: modulosEdit }))
  }

  const salvarLinkMesa = async () => {
    if (!mesaLink.trim()) return
    setMesaSalvando(true)
    await fetch('/api/mentor?action=mesa-salvar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link_zoom: mesaLink.trim() }) })
    setMesaLink('')
    await carregarMesa()
    setMesaSalvando(false)
    showPush('Mesa do Reino', 'Link do Zoom publicado para os participantes')
  }

  const limparLinkMesa = async () => {
    await fetch('/api/mentor?action=mesa-limpar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setMesaLinkSalvo(null); setMesaDefinidoEm(null)
  }

  const alunos = overview?.alunos || []
  const alunosFiltrados = alunos.filter(a => a.usuarios?.nome?.toLowerCase().includes(busca.toLowerCase()))
  const initials = (nome) => nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  // ── VISÃO DO ALUNO ABERTO ──
  if (alunoAtivo && alunoData) {
    const a = alunoData.aluno
    const encontros = alunoData.encontros || []
    const tarefas = alunoData.tarefas || []
    const mensagens = alunoData.mensagens || []
    const ferramentas = alunoData.ferramentas || []
    const alinhamento = alunoData.alinhamento || null
    const temMsgAluno = mensagens.some(m => m.de === 'aluno' && !m.lida)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="topbar">
          <div className="tlogo">CA</div>
          <div className="tright">
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{a?.usuarios?.nome}</div>
            <div className="avatar">{initials(a?.usuarios?.nome)}</div>
            <button className="exit-btn" onClick={() => { setAlunoAtivo(null); setAlunoData(null) }}>← Mentor</button>
          </div>
        </div>
        <div className="tabs">
          {TABS_ALUNO.map((t, i) => (
            <div key={i} className={`tab${alunoTab === i ? ' active' : ''}`} onClick={() => setAlunoTab(i)}>
              {t}{i === 4 && <div className={`tab-dot${temMsgAluno ? ' show' : ''}`} />}
            </div>
          ))}
        </div>
        <div className="content">

          {alunoTab === 0 && (
            <>
              <div className="card">
                <div className="card-title">{a?.mentorias?.nome}</div>
                <div className="card-sub">Controle individual</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Evolução</span>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: 'var(--amber)' }}>{pctLocal}%</span>
                </div>
                <div className="pbar"><div className="pfill" style={{ width: pctLocal + '%' }} /></div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {[-5, -1].map(d => (<button key={d} className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={() => { const v = Math.max(0, Math.min(100, pctLocal + d)); setPctLocal(v); salvarProgresso(v) }}>{d}%</button>))}
                  <span style={{ flex: 1 }} />
                  {[1, 5].map(d => (<button key={d} className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={() => { const v = Math.max(0, Math.min(100, pctLocal + d)); setPctLocal(v); salvarProgresso(v) }}>+{d}%</button>))}
                </div>
              </div>
              <div className="card">
                <div className="card-title">Acesso ao Portal</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <div className={`toggle${a?.acesso_ativo ? ' on' : ''}`} onClick={toggleAcesso} />
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{a?.acesso_ativo ? 'Acesso habilitado' : 'Acesso desabilitado'}</span>
                </div>
              </div>
              <div className="card">
                <div className="card-title">Ferramentas Individuais</div>
                <div style={{ marginTop: 10 }}>
                  {ferramentas.map(fa => (
                    <div key={fa.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: '.5px solid var(--border)' }}>
                      <span style={{ flex: 1, fontSize: 13 }}>{fa.ferramentas?.nome}</span>
                      <div className={`toggle${fa.habilitada ? ' on' : ''}`} onClick={() => toggleFerramenta(fa)} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {alunoTab === 1 && (
            <div className="card">
              <div className="card-title">Diagnóstico Inicial</div>
              <div className="card-sub">Alinhamento de Expectativas</div>
              <div style={{ marginTop: 10 }}>
                {[
                  ['Nome', a?.usuarios?.nome], ['E-mail', a?.usuarios?.email],
                  ['Telefone', alinhamento?.telefone || a?.telefone],
                  ['Mentoria', a?.mentorias?.nome],
                  ['Motivação', alinhamento?.motivacao || a?.motivacao],
                  ['Resultado esperado', alinhamento?.resultado_esperado || a?.resultado_esperado],
                  ['Área de foco', alinhamento?.area_foco || a?.area_foco],
                  ['Grande desafio', alinhamento?.grande_desafio || a?.grande_desafio],
                  ['Obstáculo', alinhamento?.obstaculo || a?.obstaculo],
                  ['Satisfação atual', (alinhamento?.satisfacao_atual || a?.satisfacao_atual) != null ? (alinhamento?.satisfacao_atual || a?.satisfacao_atual) + '/10' : '—'],
                  ['Tentativas anteriores', alinhamento?.tentativas_anteriores || a?.tentativas_anteriores],
                  ['Comprometimento', alinhamento?.comprometimento || a?.comprometimento],
                  ['Visão ideal', alinhamento?.visao_ideal || a?.visao_ideal],
                  ['Informações adicionais', alinhamento?.info_adicional || a?.info_adicional]
                ].map(([label, val]) => (
                  <div key={label} className="frow">
                    <div className="flabel">{label}</div>
                    <div className="fval">{val || '—'}</div>
                  </div>
                ))}
                {alinhamento?.preenchido_em && (
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 12, textAlign: 'right' }}>
                    Preenchido em {new Date(alinhamento.preenchido_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          )}

          {alunoTab === 2 && (
            <>
              {!editEnc ? (
                <div className="card">
                  <div className="card-title">Encontros</div>
                  <div className="card-sub">Clique para editar e agendar</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
                    {encontros.map(e => (
                      <div key={e.id} className="enc-item" onClick={() => { setEditEnc({ ...e }); setModSel(e.proximo_modalidade || 'online') }}>
                        <div className={`enc-num ${e.status}`}>{e.numero}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{e.nome}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{e.data_realizada ? new Date(e.data_realizada + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</div>
                        </div>
                        {e.status === 'done' && <span className="badge badge-green">Feito</span>}
                        {e.status === 'nxt' && <span className="badge badge-amber">Editar</span>}
                        {e.status === 'pend' && <span className="badge badge-gray">Futuro</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card">
                  <button className="back-btn" onClick={() => setEditEnc(null)}>← Encontros</button>
                  <div className="card-title">Encontro {editEnc.numero} — {editEnc.nome}</div>
                  <div className="card-sub" style={{ marginBottom: 16 }}>{editEnc.data_realizada || '—'}</div>
                  <div className="fg"><div className="fl">Resumo <span style={{ color: 'var(--ok)', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>(visível ao aluno)</span></div><textarea className="inp" value={editEnc.resumo || ''} onChange={e => setEditEnc(p => ({ ...p, resumo: e.target.value }))} placeholder="Resumo deste encontro..." /></div>
                  <div className="fg"><div className="fl">Ferramentas Aplicadas</div><input className="inp" value={editEnc.ferramentas || ''} onChange={e => setEditEnc(p => ({ ...p, ferramentas: e.target.value }))} placeholder="Ex: ATE, Código DNA" /></div>
                  <div className="fg"><div className="fl">Tarefas</div><textarea className="inp" style={{ minHeight: 60 }} value={editEnc.tarefas_texto || ''} onChange={e => setEditEnc(p => ({ ...p, tarefas_texto: e.target.value }))} placeholder="Tarefas atribuídas..." /></div>
                  <div className="divider" />
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, color: 'var(--amber)', marginBottom: 12 }}>Próximo Encontro</div>
                  <div className="fg"><div className="fl">Nome</div><input className="inp" value={editEnc.proximo_nome || ''} onChange={e => setEditEnc(p => ({ ...p, proximo_nome: e.target.value }))} placeholder="Ex: Governo da Vontade" /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="fg"><div className="fl">Data</div><input className="inp" type="date" value={editEnc.proximo_data || ''} onChange={e => setEditEnc(p => ({ ...p, proximo_data: e.target.value }))} /></div>
                    <div className="fg"><div className="fl">Horário</div><input className="inp" type="time" value={editEnc.proximo_hora || ''} onChange={e => setEditEnc(p => ({ ...p, proximo_hora: e.target.value }))} /></div>
                  </div>
                  <div className="fg">
                    <div className="fl">Modalidade</div>
                    <div className="mod-pills">
                      <div className={`mod-pill${modSel === 'online' ? ' sel' : ''}`} onClick={() => setModSel('online')}>🔗 Online</div>
                      <div className={`mod-pill${modSel === 'presencial' ? ' sel' : ''}`} onClick={() => setModSel('presencial')}>📍 Presencial</div>
                    </div>
                  </div>
                  {modSel === 'online' && <div className="fg"><div className="fl">Link</div><input className="inp" value={editEnc.proximo_link || ''} onChange={e => setEditEnc(p => ({ ...p, proximo_link: e.target.value }))} placeholder="https://meet.google.com/..." /></div>}
                  {modSel === 'presencial' && <div className="fg"><div className="fl">Endereço</div><input className="inp" value={editEnc.proximo_endereco || ''} onChange={e => setEditEnc(p => ({ ...p, proximo_endereco: e.target.value }))} placeholder="Rua, nº — bairro" /></div>}
                  <button className="btn btn-amber btn-full" onClick={salvarEncontro} disabled={savingEnc}>{savingEnc ? 'Salvando...' : 'Salvar e Notificar Aluno'}</button>
                </div>
              )}
            </>
          )}

          {alunoTab === 3 && (
            <>
              <div className="card">
                <div className="card-title">Nova Tarefa</div>
                <div className="fg" style={{ marginTop: 10 }}><div className="fl">Nome</div><input className="inp" placeholder="Ex: Reflexão sobre liderança" value={taskNome} onChange={e => setTaskNome(e.target.value)} /></div>
                <div className="fg">
                  <div className="fl">Tipo</div>
                  <select className="inp" value={taskTipo} onChange={e => setTaskTipo(e.target.value)}>
                    <option value="texto">Texto livre (aluno preenche)</option>
                    <option value="pdf">PDF (aluno baixa)</option>
                  </select>
                </div>
                <button className="btn btn-amber btn-full" onClick={adicionarTarefa}>Atribuir Tarefa</button>
              </div>
              <div className="card">
                <div className="card-title">Relatório de Tarefas</div>
                {tarefas.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '.5px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{t.nome}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{t.tipo === 'pdf' ? 'PDF' : 'Texto'}</div>
                      {t.concluida && t.resposta && <div style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--bg3)', borderRadius: 5, padding: 6, marginTop: 6, lineHeight: 1.4 }}>"{t.resposta}"</div>}
                      {t.concluida && t.concluida_em && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{new Date(t.concluida_em).toLocaleDateString('pt-BR')} · {new Date(t.concluida_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>}
                    </div>
                    <span className={t.concluida ? 'badge badge-green' : 'badge badge-gray'}>{t.concluida ? 'Feita' : 'Pendente'}</span>
                  </div>
                ))}
                {tarefas.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 20 }}>Nenhuma tarefa atribuída.</div>}
              </div>
            </>
          )}

          {alunoTab === 4 && (
            <Mensagens alunoId={alunoAtivo.id} perspectiva="mentor" onNovaMensagem={() => showPush('Mensagem enviada', `Para: ${a?.usuarios?.nome}`)} />
          )}

        </div>
      </div>
    )
  }

  // ── DASH MENTOR PRINCIPAL ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="topbar">
        <div className="tlogo">CA</div>
        <div className="tright">
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Claudio Alecrim</div>
          <div className="avatar" style={{ background: 'var(--adim)', color: 'var(--amber)' }}>CA</div>
          <button className="exit-btn" onClick={onLogout}>Sair</button>
        </div>
      </div>
      <div className="tabs">
        {TABS_MENTOR.map((t, i) => (
          <div key={i} className={`tab${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>
            {t}{i === 0 && msgDot && <div className="tab-dot show" />}
          </div>
        ))}
      </div>
      <div className="content">

        {/* VISÃO GERAL */}
        {tab === 0 && (
          <>
            <div className="card">
              <div className="card-title">Painel</div>
              <div className="card-sub">Visão consolidada</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginTop: 10 }}>
                {[
                  { label: 'Ativos', val: alunos.filter(a => a.acesso_ativo).length, color: 'var(--amber)' },
                  { label: 'Em dia', val: alunos.filter(a => a.acesso_ativo && a.pagamento_status !== 'negado').length, color: 'var(--ok)' },
                  { label: 'Inativos', val: alunos.filter(a => !a.acesso_ativo).length, color: 'var(--text2)' },
                  { label: 'Total', val: alunos.length, color: 'var(--text2)' },
                  { label: 'Mensagens', val: (overview?.mensagensNaoLidas || []).length, color: 'var(--amber)' },
                  { label: 'Tarefas', val: (overview?.tarefasPendentes || []).length, color: 'var(--text2)' }
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-num" style={{ color: s.color }}>{s.val}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title">Buscar Aluno</div>
              <div style={{ position: 'relative', marginTop: 8 }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text3)' }}>⌕</span>
                <input className="inp" style={{ paddingLeft: 34 }} placeholder="Nome do mentorado..." value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>
                {alunosFiltrados.map(a => (
                  <div key={a.id} className="li" onClick={() => abrirAluno(a)}>
                    <div className="li-avatar">{initials(a.usuarios?.nome)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{a.usuarios?.nome}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{a.mentorias?.nome}</div>
                      <div className="mini-bar"><div className="mini-fill" style={{ width: (a.progresso || 0) + '%' }} /></div>
                    </div>
                    <span className={a.acesso_ativo ? 'badge badge-green' : 'badge badge-red'}>{a.acesso_ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                ))}
                {alunosFiltrados.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 16 }}>Nenhum aluno encontrado.</div>}
              </div>
            </div>
          </>
        )}

        {/* MENTORIAS */}
        {tab === 1 && (
          <>
            {!mentoriaDetalhe ? (
              <>
                <div className="card">
                  <div className="card-title">Minhas Mentorias</div>
                  <div className="card-sub">Clique para gerenciar</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {mentorias.filter(m => m.id !== MENTORIA_MESA).map(m => (
                      <div key={m.id} className="li" onClick={() => setMentoriaDetalhe(m)}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{m.nome}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{(m.alunos || []).length} aluno(s) · {(m.encontros_template || []).length} módulos</div>
                        </div>
                        <span style={{ color: 'var(--text3)' }}>›</span>
                      </div>
                    ))}
                    {mentorias.filter(m => m.id !== MENTORIA_MESA).length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 16 }}>Nenhuma mentoria cadastrada.</div>}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">Nova Mentoria</div>
                  <div className="fg" style={{ marginTop: 10 }}><div className="fl">Nome</div><input className="inp" placeholder="Ex: Mentoria Avançada" value={novaMentoriaNome} onChange={e => setNovaMentoriaNome(e.target.value)} /></div>
                  <div className="fg">
                    <div className="fl">Nº de Módulos</div>
                    <input className="inp" type="number" min="1" max="20" placeholder="8" value={novaMentoriaQtd} onChange={e => { const n = parseInt(e.target.value) || 0; setNovaMentoriaQtd(e.target.value); setNovaMentoriaEncs(Array.from({ length: n }, (_, i) => ({ nome: novaMentoriaEncs[i]?.nome || '' }))) }} />
                  </div>
                  {novaMentoriaEncs.length > 0 && (
                    <>
                      <div className="divider" />
                      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Nome de cada módulo</div>
                      {novaMentoriaEncs.map((enc, i) => (
                        <div key={i} className="enc-edit-row">
                          <div className="enc-edit-num">{i + 1}</div>
                          <input className="enc-edit-inp" placeholder={`Módulo ${i + 1}`} value={enc.nome} onChange={e => setNovaMentoriaEncs(prev => prev.map((x, j) => j === i ? { nome: e.target.value } : x))} />
                        </div>
                      ))}
                    </>
                  )}
                  <button className="btn btn-amber btn-full" style={{ marginTop: 8 }} onClick={criarMentoria}>+ Criar Mentoria</button>
                </div>
              </>
            ) : (
              <div className="card">
                <button className="back-btn" onClick={() => { setMentoriaDetalhe(null); setEditandoModulos(false) }}>← Mentorias</button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div className="card-title">{mentoriaDetalhe.nome}</div>
                  <button className="btn btn-red" style={{ fontSize: 10, padding: '5px 12px' }} onClick={() => excluirMentoria(mentoriaDetalhe.id)}>Excluir</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>{(mentoriaDetalhe.alunos || []).length} aluno(s) · {(mentoriaDetalhe.encontros_template || []).length} módulos</div>
                <div className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Módulos</div>
                  {!editandoModulos ? (
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { setModulosEdit([...(mentoriaDetalhe.encontros_template || []).sort((a, b) => a.numero - b.numero)]); setEditandoModulos(true) }}>Editar módulos</button>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setEditandoModulos(false)}>Cancelar</button>
                      <button className="btn btn-amber" style={{ fontSize: 11, padding: '4px 10px' }} onClick={salvarModulos}>Salvar</button>
                    </div>
                  )}
                </div>
                {!editandoModulos ? (
                  (mentoriaDetalhe.encontros_template || []).sort((a, b) => a.numero - b.numero).map((e, i) => (
                    <div key={e.id || i} className="enc-edit-row">
                      <div className="enc-edit-num">{e.numero}</div>
                      <div style={{ flex: 1, fontSize: 13, color: 'var(--text2)', paddingLeft: 6 }}>{e.nome}</div>
                    </div>
                  ))
                ) : (
                  <>
                    {modulosEdit.map((e, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div className="enc-edit-num">{i + 1}</div>
                        <input className="enc-edit-inp" style={{ flex: 1 }} value={e.nome} onChange={ev => setModulosEdit(prev => prev.map((x, j) => j === i ? { ...x, nome: ev.target.value } : x))} />
                        <button onClick={() => setModulosEdit(prev => prev.filter((_, j) => j !== i))} style={{ fontSize: 16, color: 'var(--err)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>×</button>
                      </div>
                    ))}
                    <button className="btn btn-ghost" style={{ fontSize: 11, marginTop: 6, width: '100%' }} onClick={() => setModulosEdit(prev => [...prev, { id: null, numero: prev.length + 1, nome: '' }])}>+ Adicionar módulo</button>
                  </>
                )}
                <div className="divider" />
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '10px 0' }}>Alunos</div>
                {(mentoriaDetalhe.alunos || []).length === 0
                  ? <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 16 }}>Nenhum aluno nesta mentoria.</div>
                  : (mentoriaDetalhe.alunos || []).map(a => (
                    <div key={a.id} className="li" onClick={() => abrirAluno(a)}>
                      <div className="li-avatar">{initials(a.usuarios?.nome)}</div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{a.usuarios?.nome}</div></div>
                    </div>
                  ))
                }
              </div>
            )}
          </>
        )}

        {/* FERRAMENTAS */}
        {tab === 2 && (
          <div className="card">
            <div className="card-title">Ferramentas do Ecossistema</div>
            <div className="card-sub">Ativas globalmente</div>
            <div style={{ marginTop: 12 }}>
              {ferramentasGlobal.map((f, i) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: i < ferramentasGlobal.length - 1 ? '.5px solid var(--border)' : 'none' }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{f.nome}</span>
                  <div className={`toggle${f.ativo_global ? ' on' : ''}`} onClick={() => toggleFerramentaGlobal(f)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALUNOS */}
        {tab === 3 && (
          <div className="card">
            <div className="card-title">Todos os Alunos</div>
            <div className="card-sub">Histórico completo de mentorados</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
              {alunos.map(a => (
                <div key={a.id} className="li" onClick={() => abrirAluno(a)}>
                  <div className="li-avatar">{initials(a.usuarios?.nome)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{a.usuarios?.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{a.usuarios?.email}</div>
                    <div className="mini-bar"><div className="mini-fill" style={{ width: (a.progresso || 0) + '%' }} /></div>
                  </div>
                  <span className={a.acesso_ativo ? 'badge badge-green' : 'badge badge-red'}>{a.acesso_ativo ? 'Ativo' : 'Inativo'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MESA DO REINO */}
        {tab === 4 && (
          <div>
            <div className="card">
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: 'var(--amber)', marginBottom: 4 }}>Mesa do Reino</div>
              <div className="card-sub">Gerencie o link do Zoom para os participantes</div>

              {/* Link ativo */}
              {mesaLinkSalvo ? (
                <div style={{ marginTop: 16 }}>
                  <div style={{ background: 'rgba(100,200,100,.08)', border: '.5px solid rgba(100,200,100,.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Link ativo agora</div>
                    <a href={mesaLinkSalvo} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: 'var(--ok)', wordBreak: 'break-all', textDecoration: 'none' }}>{mesaLinkSalvo}</a>
                    {mesaDefinidoEm && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                        Definido às {new Date(mesaDefinidoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · expira em 2 horas
                      </div>
                    )}
                  </div>
                  <button className="btn btn-red btn-full" onClick={limparLinkMesa}>Limpar link agora</button>
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,.03)', border: '.5px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: 'var(--text3)' }}>
                    Nenhum link ativo no momento.
                  </div>
                </div>
              )}
            </div>

            {/* Campo para novo link */}
            <div className="card">
              <div className="card-title">Publicar novo link</div>
              <div className="card-sub">O link aparece automaticamente para todos os participantes e expira em 2 horas</div>
              <div className="fg" style={{ marginTop: 14 }}>
                <div className="fl">Link do Zoom</div>
                <input className="inp" placeholder="https://us05web.zoom.us/j/..." value={mesaLink} onChange={e => setMesaLink(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && salvarLinkMesa()} />
              </div>
              <button className="btn btn-amber btn-full" onClick={salvarLinkMesa} disabled={mesaSalvando || !mesaLink.trim()}>
                {mesaSalvando ? 'Publicando...' : 'Publicar link'}
              </button>
            </div>

            {/* Participantes Mesa do Reino */}
            <div className="card">
              <div className="card-title">Participantes</div>
              <div className="card-sub">Alunos com acesso à Mesa do Reino</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
                {alunos.filter(a => a.mentorias?.id === MENTORIA_MESA || a.mentorias?.nome === 'Mesa do Reino').map(a => (
                  <div key={a.id} className="li">
                    <div className="li-avatar">{initials(a.usuarios?.nome)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{a.usuarios?.nome}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{a.usuarios?.email}</div>
                    </div>
                    <span className={a.acesso_ativo ? 'badge badge-green' : 'badge badge-red'}>{a.acesso_ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
