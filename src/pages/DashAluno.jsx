import { useState, useEffect } from 'react'
import Mensagens from '../components/Mensagens.jsx'

const TABS = ['Início', 'Encontros', 'Tarefas', 'Ferramentas', 'Financeiro', 'Mensagens']

export default function DashAluno({ user, onLogout, showPush }) {
  const [tab, setTab] = useState(0)
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [encDetalhe, setEncDetalhe] = useState(null)
  const [taskResposta, setTaskResposta] = useState({})
  const [msgDot, setMsgDot] = useState(false)
  const [aviseTexto, setAviseTexto] = useState('')

  const alunoId = user?.aluno?.id

  const carregar = async () => {
    if (!alunoId) return
    try {
      const res = await fetch(`/api/aluno?action=dados&aluno_id=${alunoId}`)
      const data = await res.json()
      setDados(data)
      const naoLidas = (data.mensagens || []).filter(m => m.de === 'mentor' && !m.lida)
      setMsgDot(naoLidas.length > 0)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [alunoId])

  const marcarFeita = async (tarefa) => {
    const resposta = taskResposta[tarefa.id] || ''
    if (!resposta.trim()) { alert('Escreva uma resposta antes de marcar como feita.'); return }
    try {
      await fetch('/api/aluno?action=tarefa-concluir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarefa_id: tarefa.id, resposta })
      })
      carregar()
    } catch {}
  }

  const enviarAvise = async () => {
    if (!aviseTexto.trim() || !alunoId) return
    try {
      await fetch('/api/aluno?action=mensagem-enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aluno_id: alunoId, de: 'aluno', texto: aviseTexto.trim() })
      })
      setAviseTexto('')
      alert('Mensagem enviada ao seu mentor!')
    } catch {}
  }

  const proxEnc = dados?.encontros?.find(e => e.status === 'nxt')
  const formatDt = (d, h) => {
    if (!d) return '—'
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) + (h ? ' · ' + h.slice(0,5) : '')
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  const aluno = dados?.aluno
  const encontros = dados?.encontros || []
  const tarefas = dados?.tarefas || []
  const ferramentas = dados?.ferramentas || []
  const parcelas = dados?.parcelas || []
  const progresso = aluno?.progresso || 0
  const mentoriaNome = aluno?.mentorias?.nome || user?.aluno?.mentorias?.nome || 'Mentoria'
  const initials = user.nome?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()

  const tarefasAbertas = tarefas.filter(t => !t.concluida)
  const tarefasConcluidas = tarefas.filter(t => t.concluida)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="topbar">
        <div className="tlogo">CA</div>
        <div className="tright">
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{user.nome}</div>
          <div className="avatar">{initials}</div>
          <button className="exit-btn" onClick={onLogout}>Sair</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t, i) => (
          <div key={i} className={`tab${tab === i ? ' active' : ''}`} onClick={() => { setTab(i); if (i === 5) setMsgDot(false) }}>
            {t}
            {i === 5 && <div className={`tab-dot${msgDot ? ' show' : ''}`} />}
          </div>
        ))}
      </div>

      <div className="content">

        {/* INÍCIO */}
        {tab === 0 && (
          <>
            <div className="card">
              <div className="card-title">{mentoriaNome}</div>
              <div className="card-sub">Processo de {encontros.length} encontros</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Evolução do processo</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: 'var(--amber)' }}>{progresso}%</span>
              </div>
              <div className="pbar"><div className="pfill" style={{ width: progresso + '%' }} /></div>
            </div>

            {proxEnc && (
              <div className="card">
                <div className="card-title">Próximo Encontro</div>
                <div className="next-enc-card">
                  <div className="next-enc-label">Confirmado pelo mentor</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{proxEnc.proximo_nome || proxEnc.nome}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>📅 {formatDt(proxEnc.proximo_data, proxEnc.proximo_hora)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{proxEnc.proximo_modalidade === 'online' ? '🔗 Online' : '📍 Presencial'}</span>
                  </div>
                  {proxEnc.proximo_modalidade === 'online' && proxEnc.proximo_link && (
                    <div style={{ marginTop: 8 }}>
                      <a href={proxEnc.proximo_link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--amber)', border: '.5px solid rgba(200,169,122,.3)', borderRadius: 6, padding: '4px 10px', textDecoration: 'none' }}>
                        Acessar link da reunião →
                      </a>
                    </div>
                  )}
                  {proxEnc.proximo_modalidade === 'presencial' && proxEnc.proximo_endereco && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>📍 {proxEnc.proximo_endereco}</div>
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-title">Avise seu Mentor</div>
              <div className="card-sub">Envie uma mensagem direta ao Claudio</div>
              <textarea className="inp" placeholder="Escreva sua mensagem..." style={{ marginBottom: 10, minHeight: 80 }} value={aviseTexto} onChange={e => setAviseTexto(e.target.value)} />
              <button className="avise-btn" onClick={enviarAvise}>Enviar mensagem ao mentor</button>
            </div>

            {tarefasAbertas.length > 0 && (
              <div className="card">
                <div className="card-title">Tarefas em Aberto</div>
                <div className="card-sub">{tarefasAbertas.length} pendente{tarefasAbertas.length > 1 ? 's' : ''}</div>
                {tarefasAbertas.slice(0, 3).map(t => (
                  <div key={t.id} className="task-item">
                    <div className="task-check" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{t.nome}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{t.tipo === 'pdf' ? '📄 PDF' : '✏️ Texto'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ENCONTROS */}
        {tab === 1 && (
          <>
            {!encDetalhe ? (
              <div className="card">
                <div className="card-title">Encontros do Processo</div>
                <div className="card-sub">{mentoriaNome} · {encontros.length} encontros</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
                  {encontros.map(e => (
                    <div key={e.id} className="enc-item" onClick={() => e.status === 'done' && setEncDetalhe(e)}>
                      <div className={`enc-num ${e.status}`}>{e.numero}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{e.nome}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{e.data_realizada ? new Date(e.data_realizada + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</div>
                      </div>
                      {e.status === 'done' && <span className="badge badge-green">Feito</span>}
                      {e.status === 'nxt' && <span className="badge badge-amber">Próximo</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card">
                <button className="back-btn" onClick={() => setEncDetalhe(null)}>← Voltar</button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div className="card-title">Encontro {encDetalhe.numero}</div>
                  <span className="badge badge-green">Concluído</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--amber)', fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, marginBottom: 3 }}>{encDetalhe.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>{encDetalhe.data_realizada ? new Date(encDetalhe.data_realizada + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</div>
                <div className="divider" />
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>Resumo</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{encDetalhe.resumo || '—'}</div>
                </div>
                {encDetalhe.ferramentas && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>Ferramentas Aplicadas</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {encDetalhe.ferramentas.split(',').map((f, i) => <span key={i} className="badge badge-amber">{f.trim()}</span>)}
                    </div>
                  </div>
                )}
                {encDetalhe.tarefas_texto && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>Tarefas</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{encDetalhe.tarefas_texto}</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TAREFAS */}
        {tab === 2 && (
          <div className="card">
            <div className="card-title">Minhas Tarefas</div>
            <div className="card-sub">Tarefas concluídas não podem ser desfeitas</div>
            {tarefasAbertas.length > 0 && (
              <>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', margin: '10px 0 8px' }}>Em aberto</div>
                {tarefasAbertas.map(t => (
                  <div key={t.id} className="task-item">
                    <div className="task-check" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{t.nome}</div>
                      {t.tipo === 'pdf' ? (
                        t.arquivo_url
                          ? <a href={t.arquivo_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--amber)', border: '.5px solid rgba(200,169,122,.3)', borderRadius: 5, padding: '3px 9px', textDecoration: 'none' }}>↓ Baixar PDF</a>
                          : <span style={{ fontSize: 11, color: 'var(--text3)' }}>📄 Arquivo pendente</span>
                      ) : (
                        <>
                          <textarea className="inp" style={{ minHeight: 60, marginTop: 4, fontSize: 12 }} placeholder="Escreva sua resposta..."
                            value={taskResposta[t.id] || ''}
                            onChange={e => setTaskResposta(prev => ({ ...prev, [t.id]: e.target.value }))}
                          />
                          <button className="btn btn-amber" style={{ fontSize: 11, padding: '5px 12px', marginTop: 5 }} onClick={() => marcarFeita(t)}>
                            Marcar como feita
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            {tarefasConcluidas.length > 0 && (
              <>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', margin: '14px 0 8px' }}>Concluídas</div>
                {tarefasConcluidas.map(t => (
                  <div key={t.id} className="task-item">
                    <div className="task-check done" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text3)' }}>{t.nome}</div>
                      {t.resposta && <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg3)', borderRadius: 6, padding: 8, lineHeight: 1.5, marginTop: 6 }}>{t.resposta}</div>}
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                        Concluído · {t.concluida_em ? new Date(t.concluida_em).toLocaleDateString('pt-BR') + ' · ' + new Date(t.concluida_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {tarefas.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 20 }}>Nenhuma tarefa atribuída ainda.</div>}
          </div>
        )}

        {/* FERRAMENTAS */}
        {tab === 3 && (
          <div className="card">
            <div className="card-title">Ferramentas</div>
            <div className="card-sub">Liberadas pelo mentor</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 10 }}>
              {ferramentas.map(fa => {
                const f = fa.ferramentas
                const habilitada = fa.habilitada && f?.ativo_global
                return (
                  <div key={fa.id} style={{
                    background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 'var(--r)',
                    padding: 13, cursor: habilitada ? 'pointer' : 'not-allowed', opacity: habilitada ? 1 : 0.4,
                    transition: 'all .2s'
                  }}
                    onMouseOver={e => habilitada && (e.currentTarget.style.borderColor = 'var(--amber)')}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    onClick={() => habilitada && f?.url && (window.location.href = f.url)}
                  >
                    <div style={{ fontSize: 16, marginBottom: 6 }}>◉</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{f?.nome}</div>
                    <div style={{ marginTop: 4 }}>
                      <span className={habilitada ? 'badge badge-green' : 'badge badge-gray'}>
                        {habilitada ? 'Disponível' : 'Bloqueada'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* FINANCEIRO */}
        {tab === 4 && (
          <div className="card">
            <div className="card-title">Financeiro</div>
            <div className="card-sub">{parcelas.length} parcelas</div>
            <div style={{ background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 'var(--r)', padding: 13 }}>
              {parcelas.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < parcelas.length - 1 ? '.5px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>Parcela {p.numero}/{parcelas.length}</div>
                    <div style={{ fontSize: 10, color: p.paga ? 'var(--text3)' : 'var(--warn)' }}>
                      {p.vencimento ? new Date(p.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      {p.valor ? ` · R$ ${Number(p.valor).toFixed(2)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <span className={p.paga ? 'badge badge-green' : 'badge badge-amber'}>{p.paga ? 'Pago' : 'Pendente'}</span>
                    {!p.paga && p.boleto_url && (
                      <a href={p.boleto_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: 'var(--amber)', border: '.5px solid rgba(200,169,122,.3)', borderRadius: 5, padding: '3px 8px', textDecoration: 'none' }}>↓ Boleto</a>
                    )}
                  </div>
                </div>
              ))}
              {parcelas.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 16 }}>Nenhuma parcela cadastrada.</div>}
            </div>
          </div>
        )}

        {/* MENSAGENS */}
        {tab === 5 && alunoId && (
          <Mensagens alunoId={alunoId} perspectiva="aluno" onNovaMensagem={() => {}} />
        )}

      </div>
    </div>
  )
}
