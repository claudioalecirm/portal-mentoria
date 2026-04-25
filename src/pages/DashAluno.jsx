// src/pages/DashAluno.jsx
import { useState, useEffect } from 'react'

const TABS = ['Início', 'Encontros', 'Tarefas', 'Ferramentas', 'Financeiro', 'Mensagens']

export default function DashAluno({ user, onLogout }) {
  const [tab, setTab] = useState(0)
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => { carregarDados() }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/aluno?action=dados&usuario_id=${user.id}`)
      const d = await r.json()
      setDados(d)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const enviarMensagem = async () => {
    if (!msg.trim()) return
    setEnviando(true)
    await fetch('/api/aluno?action=mensagem', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aluno_id: dados?.aluno?.id, texto: msg })
    })
    setMsg('')
    await carregarDados()
    setEnviando(false)
  }

  const concluirTarefa = async (tarefa_id, resposta) => {
    await fetch('/api/aluno?action=concluir-tarefa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tarefa_id, resposta })
    })
    await carregarDados()
  }

  const s = { card: { background: '#111', border: '.5px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '20px 18px', marginBottom: 12 }, label: { fontSize: 10, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }, value: { fontSize: 14, color: '#f0ece4' }, amber: { color: '#c8a97a' } }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}><div className="spinner" /></div>

  const { aluno, encontros, tarefas, mensagens, ferramentas, parcelas, alinhamento } = dados || {}
  const pagamentoStatus = aluno?.pagamento_status
  const formaP = aluno?.forma_pagamento

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: '#0a0a0a', borderBottom: '.5px solid rgba(255,255,255,.07)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#c8a97a' }}>Claudio Alecrim</div>
          <div style={{ fontSize: 11, color: '#5a5550' }}>{aluno?.mentorias?.nome}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#9a9590' }}>{user.nome}</div>
          <button onClick={onLogout} style={{ fontSize: 11, color: '#5a5550', background: 'none', border: 'none', cursor: 'pointer' }}>Sair</button>
        </div>
      </div>

      {/* Aviso de pagamento negado */}
      {pagamentoStatus === 'negado' && (
        <div style={{ background: 'rgba(196,90,90,.1)', border: '.5px solid rgba(196,90,90,.4)', margin: '12px 16px', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#c45a5a' }}>
          ⚠️ {aluno?.pagamento_aviso}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '.5px solid rgba(255,255,255,.07)', padding: '0 16px' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{ padding: '12px 14px', fontSize: 12, color: tab === i ? '#c8a97a' : '#5a5550', background: 'none', border: 'none', borderBottom: tab === i ? '1.5px solid #c8a97a' : '1.5px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 16px' }}>

        {/* INÍCIO */}
        {tab === 0 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#f0ece4', marginBottom: 4 }}>
              Olá, {user.nome.split(' ')[0]}
            </div>
            <div style={{ fontSize: 13, color: '#9a9590', marginBottom: 24 }}>Bem-vindo ao seu portal de mentoria.</div>

            {/* Progresso */}
            <div style={s.card}>
              <div style={s.label}>Seu progresso</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: '#f0ece4' }}>{aluno?.mentorias?.nome}</div>
                <div style={{ fontSize: 13, color: '#c8a97a' }}>{aluno?.progresso || 0}%</div>
              </div>
              <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2 }}>
                <div style={{ height: 4, background: '#c8a97a', borderRadius: 2, width: `${aluno?.progresso || 0}%`, transition: 'width .5s' }} />
              </div>
            </div>

            {/* Próximo encontro */}
            {encontros?.find(e => e.status === 'nxt') && (
              <div style={{ ...s.card, border: '.5px solid rgba(200,169,122,.2)' }}>
                <div style={s.label}>Próximo encontro</div>
                <div style={{ fontSize: 15, color: '#c8a97a', fontFamily: "'Cormorant Garamond',serif", marginBottom: 4 }}>
                  {encontros.find(e => e.status === 'nxt')?.nome}
                </div>
                {encontros.find(e => e.status === 'nxt')?.proximo_agendado && (
                  <div style={{ fontSize: 12, color: '#9a9590' }}>
                    {new Date(encontros.find(e => e.status === 'nxt').proximo_agendado).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            )}

            {/* Tarefas pendentes */}
            {tarefas?.filter(t => !t.concluida).length > 0 && (
              <div style={s.card}>
                <div style={s.label}>Tarefas pendentes</div>
                <div style={{ fontSize: 24, color: '#c8a97a', fontWeight: 500 }}>{tarefas.filter(t => !t.concluida).length}</div>
              </div>
            )}

            {/* Mensagens não lidas */}
            {mensagens?.filter(m => m.de === 'mentor' && !m.lida).length > 0 && (
              <div style={{ ...s.card, border: '.5px solid rgba(200,169,122,.3)' }}>
                <div style={{ fontSize: 13, color: '#c8a97a' }}>
                  💬 {mensagens.filter(m => m.de === 'mentor' && !m.lida).length} mensagem(ns) nova(s) do mentor
                </div>
              </div>
            )}
          </div>
        )}

        {/* ENCONTROS */}
        {tab === 1 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 16 }}>Seus Encontros</div>
            {encontros?.map(enc => (
              <div key={enc.id} style={{ ...s.card, opacity: enc.status === 'done' ? .6 : 1, borderColor: enc.status === 'nxt' ? 'rgba(200,169,122,.3)' : 'rgba(255,255,255,.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#5a5550' }}>Encontro {enc.numero}</div>
                  <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: enc.status === 'done' ? 'rgba(100,200,100,.1)' : enc.status === 'nxt' ? 'rgba(200,169,122,.1)' : 'rgba(255,255,255,.05)', color: enc.status === 'done' ? '#64c864' : enc.status === 'nxt' ? '#c8a97a' : '#5a5550' }}>
                    {enc.status === 'done' ? 'Concluído' : enc.status === 'nxt' ? 'Próximo' : 'Pendente'}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: '#f0ece4', marginBottom: enc.resumo ? 8 : 0 }}>{enc.nome}</div>
                {enc.resumo && <div style={{ fontSize: 12, color: '#9a9590', lineHeight: 1.5 }}>{enc.resumo}</div>}
                {enc.proximo_agendado && enc.status === 'nxt' && (
                  <div style={{ fontSize: 11, color: '#c8a97a', marginTop: 6 }}>
                    📅 {new Date(enc.proximo_agendado).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
            {!encontros?.length && <div style={{ fontSize: 13, color: '#5a5550', textAlign: 'center', padding: 40 }}>Seus encontros aparecerão aqui.</div>}
          </div>
        )}

        {/* TAREFAS */}
        {tab === 2 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 16 }}>Suas Tarefas</div>
            {tarefas?.map(t => (
              <div key={t.id} style={{ ...s.card, opacity: t.concluida ? .5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, color: t.concluida ? '#5a5550' : '#f0ece4', textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.nome}</div>
                  {t.concluida && <div style={{ fontSize: 11, color: '#64c864' }}>✓ Concluída</div>}
                </div>
                {!t.concluida && (
                  <TarefaForm tarefa={t} onConcluir={concluirTarefa} />
                )}
                {t.concluida && t.resposta && (
                  <div style={{ fontSize: 12, color: '#9a9590', marginTop: 4 }}>{t.resposta}</div>
                )}
              </div>
            ))}
            {!tarefas?.length && <div style={{ fontSize: 13, color: '#5a5550', textAlign: 'center', padding: 40 }}>Nenhuma tarefa ainda.</div>}
          </div>
        )}

        {/* FERRAMENTAS */}
        {tab === 3 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 16 }}>Ferramentas</div>
            {ferramentas?.map(fa => (
              <a key={fa.id} href={fa.ferramentas?.url} target="_blank" rel="noreferrer"
                style={{ ...s.card, display: 'block', textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ fontSize: 14, color: '#c8a97a' }}>{fa.ferramentas?.nome}</div>
                <div style={{ fontSize: 11, color: '#5a5550', marginTop: 4 }}>Clique para acessar →</div>
              </a>
            ))}
            {!ferramentas?.length && <div style={{ fontSize: 13, color: '#5a5550', textAlign: 'center', padding: 40 }}>Nenhuma ferramenta disponível ainda.</div>}
          </div>
        )}

        {/* FINANCEIRO */}
        {tab === 4 && (
          <FinanceiroAluno aluno={aluno} parcelas={parcelas} />
        )}

        {/* MENSAGENS */}
        {tab === 5 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 16 }}>Mensagens</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {mensagens?.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.de === 'aluno' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '80%', background: m.de === 'aluno' ? 'rgba(200,169,122,.15)' : '#171717', border: `.5px solid ${m.de === 'aluno' ? 'rgba(200,169,122,.3)' : 'rgba(255,255,255,.07)'}`, borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: '#5a5550', marginBottom: 4 }}>{m.de === 'mentor' ? 'Claudio' : 'Você'}</div>
                    <div style={{ fontSize: 13, color: '#f0ece4', lineHeight: 1.5 }}>{m.texto}</div>
                  </div>
                </div>
              ))}
              {!mensagens?.length && <div style={{ fontSize: 13, color: '#5a5550', textAlign: 'center', padding: 30 }}>Nenhuma mensagem ainda.</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea value={msg} onChange={e => setMsg(e.target.value)}
                placeholder="Escreva uma mensagem para seu mentor..."
                style={{ flex: 1, background: '#171717', border: '.5px solid rgba(255,255,255,.13)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f0ece4', fontFamily: "'DM Sans',sans-serif", resize: 'none', minHeight: 60, outline: 'none' }} />
              <button onClick={enviarMensagem} disabled={enviando || !msg.trim()}
                style={{ background: '#c8a97a', border: 'none', borderRadius: 10, padding: '0 18px', color: '#0a0a0a', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: enviando ? .7 : 1, fontFamily: "'DM Sans',sans-serif" }}>
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TarefaForm({ tarefa, onConcluir }) {
  const [resposta, setResposta] = useState('')
  return (
    <div>
      <textarea value={resposta} onChange={e => setResposta(e.target.value)}
        placeholder="Escreva sua resposta ou reflexão..."
        style={{ width: '100%', background: '#0a0a0a', border: '.5px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f0ece4', fontFamily: "'DM Sans',sans-serif", resize: 'none', minHeight: 60, outline: 'none', boxSizing: 'border-box' }} />
      <button onClick={() => onConcluir(tarefa.id, resposta)}
        style={{ marginTop: 8, background: 'rgba(200,169,122,.12)', border: '.5px solid rgba(200,169,122,.3)', borderRadius: 8, padding: '8px 16px', fontSize: 12, color: '#c8a97a', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
        Marcar como concluída
      </button>
    </div>
  )
}

function FinanceiroAluno({ aluno, parcelas }) {
  const formaP = aluno?.forma_pagamento
  const isPago = formaP === 'cartao' || formaP === 'pix'

  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 16 }}>Financeiro</div>

      {/* Status geral */}
      <div style={{ background: '#111', border: `.5px solid ${isPago ? 'rgba(100,200,100,.2)' : 'rgba(200,169,122,.2)'}`, borderRadius: 12, padding: '18px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Status do pagamento</div>
        {isPago ? (
          <div>
            <div style={{ fontSize: 16, color: '#64c864', marginBottom: 4 }}>✓ Mentoria paga</div>
            <div style={{ fontSize: 12, color: '#9a9590' }}>
              Pagamento realizado via {formaP === 'cartao' ? 'cartão de crédito' : 'Pix'}.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 14, color: '#c8a97a', marginBottom: 4 }}>Pagamento via boleto</div>
            <div style={{ fontSize: 12, color: '#9a9590' }}>Seus boletos estão disponíveis abaixo.</div>
          </div>
        )}
      </div>

      {/* Boletos — apenas se for boleto */}
      {formaP === 'boleto' && (
        <div>
          <div style={{ fontSize: 12, color: '#5a5550', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>Parcelas</div>
          {parcelas?.map(p => (
            <div key={p.id} style={{ background: '#111', border: `.5px solid ${p.paga ? 'rgba(100,200,100,.2)' : 'rgba(255,255,255,.07)'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#f0ece4', marginBottom: 2 }}>Parcela {p.numero}</div>
                <div style={{ fontSize: 12, color: '#9a9590' }}>
                  R$ {Number(p.valor).toFixed(2).replace('.', ',')}
                  {p.vencimento && ` · Vence ${new Date(p.vencimento).toLocaleDateString('pt-BR')}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {p.paga ? (
                  <div style={{ fontSize: 11, color: '#64c864' }}>✓ Paga</div>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: '#c45a5a' }}>Em aberto</div>
                    {p.boleto_url && (
                      <a href={p.boleto_url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, background: 'rgba(200,169,122,.12)', border: '.5px solid rgba(200,169,122,.3)', borderRadius: 6, padding: '4px 10px', color: '#c8a97a', textDecoration: 'none' }}>
                        Baixar
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
