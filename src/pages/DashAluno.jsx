// src/pages/DashAluno.jsx
import { useState, useEffect } from 'react'

const MENTORIA_MESA = '10000000-0000-0000-0000-000000000003'

export default function DashAluno({ user, onLogout }) {
  const [tab, setTab] = useState(0)
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mesaLink, setMesaLink] = useState(null)

  const isMesaReinoPuro = user?.aluno?.mentorias?.id === MENTORIA_MESA ||
    user?.aluno?.mentoria_id === MENTORIA_MESA

  // Tabs para mentoria normal
  const TABS = isMesaReinoPuro
    ? ['Mesa do Reino']
    : ['Início', 'Encontros', 'Tarefas', 'Ferramentas', 'Mensagens', 'Mesa do Reino']

  useEffect(() => { carregarDados() }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/aluno?action=dados&usuario_id=${user.id}`)
      const d = await r.json()
      setDados(d)
    } catch {}
    finally { setLoading(false) }
  }

  const carregarMesa = async () => {
    try {
      const r = await fetch('/api/mentor?action=mesa-config')
      const d = await r.json()
      setMesaLink(d.link_zoom || null)
    } catch {}
  }

  useEffect(() => {
    const tabMesaIndex = isMesaReinoPuro ? 0 : 5
    if (tab === tabMesaIndex) carregarMesa()
  }, [tab])

  const enviarMensagem = async () => {
    if (!msg.trim()) return
    setEnviando(true)
    await fetch('/api/aluno?action=mensagem', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aluno_id: dados?.aluno?.id, texto: msg })
    })
    setMsg(''); await carregarDados(); setEnviando(false)
  }

  const concluirTarefa = async (tarefa_id, resposta) => {
    await fetch('/api/aluno?action=concluir-tarefa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tarefa_id, resposta })
    })
    await carregarDados()
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
      <div className="spinner" />
    </div>
  )

  const { aluno, encontros, tarefas, mensagens, ferramentas } = dados || {}

  // ── DASH MESA DO REINO PURO ──
  if (isMesaReinoPuro) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="topbar">
          <div className="tlogo">CA</div>
          <div className="tright">
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{user.nome}</div>
            <button className="exit-btn" onClick={onLogout}>Sair</button>
          </div>
        </div>
        <div className="content">
          <MesaReinoAluno link={mesaLink} onCarregar={carregarMesa} />
        </div>
      </div>
    )
  }

  // ── DASH MENTORIA NORMAL ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="topbar">
        <div className="tlogo">CA</div>
        <div className="tright">
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{user.nome}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{aluno?.mentorias?.nome}</div>
          <button className="exit-btn" onClick={onLogout}>Sair</button>
        </div>
      </div>
      <div className="tabs">
        {TABS.map((t, i) => (
          <div key={i} className={`tab${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>{t}</div>
        ))}
      </div>
      <div className="content">

        {/* INÍCIO */}
        {tab === 0 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>Olá, {user.nome.split(' ')[0]}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Bem-vindo ao seu portal de mentoria.</div>
            <div className="card">
              <div className="card-sub">Progresso</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{aluno?.mentorias?.nome}</span>
                <span style={{ fontSize: 13, color: 'var(--amber)' }}>{aluno?.progresso || 0}%</span>
              </div>
              <div className="pbar"><div className="pfill" style={{ width: `${aluno?.progresso || 0}%` }} /></div>
            </div>
            {encontros?.find(e => e.status === 'nxt') && (
              <div className="card" style={{ borderColor: 'rgba(200,169,122,.2)' }}>
                <div className="card-sub">Próximo encontro</div>
                <div style={{ fontSize: 15, color: 'var(--amber)', fontFamily: "'Cormorant Garamond',serif", marginBottom: 4 }}>{encontros.find(e => e.status === 'nxt')?.nome}</div>
                {encontros.find(e => e.status === 'nxt')?.proximo_data && (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {new Date(encontros.find(e => e.status === 'nxt').proximo_data + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                    {encontros.find(e => e.status === 'nxt')?.proximo_hora && ` às ${encontros.find(e => e.status === 'nxt').proximo_hora}`}
                  </div>
                )}
              </div>
            )}
            {tarefas?.filter(t => !t.concluida).length > 0 && (
              <div className="card">
                <div className="card-sub">Tarefas pendentes</div>
                <div style={{ fontSize: 28, color: 'var(--amber)', fontFamily: "'Cormorant Garamond',serif" }}>{tarefas.filter(t => !t.concluida).length}</div>
              </div>
            )}
          </div>
        )}

        {/* ENCONTROS */}
        {tab === 1 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: 'var(--text)', marginBottom: 14 }}>Seus Encontros</div>
            {encontros?.map(enc => (
              <div key={enc.id} className="card" style={{ opacity: enc.status === 'done' ? .6 : 1, borderColor: enc.status === 'nxt' ? 'rgba(200,169,122,.3)' : 'var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Encontro {enc.numero}</div>
                  <span className={enc.status === 'done' ? 'badge badge-green' : enc.status === 'nxt' ? 'badge badge-amber' : 'badge badge-gray'}>
                    {enc.status === 'done' ? 'Concluído' : enc.status === 'nxt' ? 'Próximo' : 'Futuro'}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: enc.resumo ? 8 : 0 }}>{enc.nome}</div>
                {enc.resumo && <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{enc.resumo}</div>}
                {enc.status === 'nxt' && enc.proximo_data && (
                  <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6 }}>
                    📅 {new Date(enc.proximo_data + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                    {enc.proximo_hora && ` às ${enc.proximo_hora}`}
                    {enc.proximo_modalidade === 'online' && enc.proximo_link && (
                      <a href={enc.proximo_link} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: 'var(--amber)' }}>🔗 Entrar</a>
                    )}
                    {enc.proximo_modalidade === 'presencial' && enc.proximo_endereco && (
                      <span style={{ marginLeft: 8 }}>📍 {enc.proximo_endereco}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!encontros?.length && <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Seus encontros aparecerão aqui.</div>}
          </div>
        )}

        {/* TAREFAS */}
        {tab === 2 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: 'var(--text)', marginBottom: 14 }}>Suas Tarefas</div>
            {tarefas?.map(t => (
              <div key={t.id} className="card" style={{ opacity: t.concluida ? .5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, color: t.concluida ? 'var(--text3)' : 'var(--text)', textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.nome}</div>
                  {t.concluida && <span className="badge badge-green">✓ Feita</span>}
                </div>
                {!t.concluida && <TarefaForm tarefa={t} onConcluir={concluirTarefa} />}
                {t.concluida && t.resposta && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{t.resposta}</div>}
              </div>
            ))}
            {!tarefas?.length && <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Nenhuma tarefa ainda.</div>}
          </div>
        )}

        {/* FERRAMENTAS */}
        {tab === 3 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: 'var(--text)', marginBottom: 14 }}>Ferramentas</div>
            {ferramentas?.map(fa => (
              <a key={fa.id} href={fa.ferramentas?.url} target="_blank" rel="noreferrer" className="card" style={{ display: 'block', textDecoration: 'none', cursor: 'pointer', marginBottom: 10 }}>
                <div style={{ fontSize: 14, color: 'var(--amber)' }}>{fa.ferramentas?.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Clique para acessar →</div>
              </a>
            ))}
            {!ferramentas?.length && <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Nenhuma ferramenta disponível ainda.</div>}
          </div>
        )}

        {/* MENSAGENS */}
        {tab === 4 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: 'var(--text)', marginBottom: 14 }}>Mensagens</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {mensagens?.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.de === 'aluno' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '80%', background: m.de === 'aluno' ? 'rgba(200,169,122,.15)' : 'var(--bg2)', border: `.5px solid ${m.de === 'aluno' ? 'rgba(200,169,122,.3)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>{m.de === 'mentor' ? 'Claudio' : 'Você'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{m.texto}</div>
                  </div>
                </div>
              ))}
              {!mensagens?.length && <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 30 }}>Nenhuma mensagem ainda.</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Escreva uma mensagem para seu mentor..."
                style={{ flex: 1, background: 'var(--bg2)', border: '.5px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text)', fontFamily: "'DM Sans',sans-serif", resize: 'none', minHeight: 60, outline: 'none' }} />
              <button onClick={enviarMensagem} disabled={enviando || !msg.trim()}
                style={{ background: 'var(--amber)', border: 'none', borderRadius: 10, padding: '0 18px', color: '#0a0a0a', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                Enviar
              </button>
            </div>
          </div>
        )}

        {/* MESA DO REINO — bônus para mentorados */}
        {tab === 5 && (
          <MesaReinoAluno link={mesaLink} onCarregar={carregarMesa} />
        )}

      </div>
    </div>
  )
}

function TarefaForm({ tarefa, onConcluir }) {
  const [resposta, setResposta] = useState('')
  return (
    <div>
      <textarea value={resposta} onChange={e => setResposta(e.target.value)} placeholder="Escreva sua resposta ou reflexão..."
        style={{ width: '100%', background: 'var(--bg)', border: '.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text)', fontFamily: "'DM Sans',sans-serif", resize: 'none', minHeight: 60, outline: 'none', boxSizing: 'border-box' }} />
      <button onClick={() => onConcluir(tarefa.id, resposta)}
        style={{ marginTop: 8, background: 'rgba(200,169,122,.12)', border: '.5px solid rgba(200,169,122,.3)', borderRadius: 8, padding: '8px 16px', fontSize: 12, color: 'var(--amber)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
        Marcar como concluída
      </button>
    </div>
  )
}

function MesaReinoAluno({ link, onCarregar }) {
  useEffect(() => { onCarregar() }, [])

  return (
    <div>
      {/* Card principal */}
      <div className="card" style={{ borderColor: 'rgba(200,169,122,.15)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: 'var(--amber)', marginBottom: 4 }}>Mesa do Reino</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20 }}>
          Encontros ao vivo com Claudio Alecrim e outros homens em processo de governo espiritual e pessoal.
        </div>

        {link ? (
          <div>
            <div style={{ fontSize: 12, color: 'var(--ok)', marginBottom: 10 }}>● Reunião ao vivo agora</div>
            <a href={link} target="_blank" rel="noreferrer"
              style={{ display: 'block', background: 'var(--amber)', color: '#0a0a0a', textDecoration: 'none', padding: '14px', borderRadius: 8, textAlign: 'center', fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
              🎥 Entrar na reunião agora
            </a>
          </div>
        ) : (
          <div style={{ background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 8, padding: '14px 16px', fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginBottom: 16 }}>
            Nenhuma reunião ao vivo no momento.<br />
            <span style={{ fontSize: 11 }}>O link aparecerá aqui quando a sessão for iniciada.</span>
          </div>
        )}

        {/* Cobrança */}
        <div style={{ fontSize: 12, color: 'var(--text3)', borderTop: '.5px solid var(--border)', paddingTop: 14, lineHeight: 1.6 }}>
          💳 As cobranças são realizadas todo dia <strong style={{ color: 'var(--text2)' }}>4 de cada mês</strong> pela Kiwify.
        </div>
      </div>

      {/* Propaganda discreta */}
      <div className="card" style={{ background: 'transparent', border: '.5px solid rgba(200,169,122,.1)' }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Conheça também</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          Para um acompanhamento mais profundo, conheça as mentorias individuais de Claudio Alecrim —
          um processo estruturado de governo pessoal, identidade e maturidade espiritual.
        </div>
        <a href="https://claudioalecrim.com.br" target="_blank" rel="noreferrer"
          style={{ fontSize: 12, color: 'var(--amber)', textDecoration: 'none', borderBottom: '.5px solid rgba(200,169,122,.3)', paddingBottom: 1 }}>
          claudioalecrim.com.br →
        </a>
      </div>
    </div>
  )
}
