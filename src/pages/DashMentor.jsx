// src/pages/DashMentor.jsx
import { useState, useEffect } from 'react'

export default function DashMentor({ user, onLogout }) {
  const [alunos, setAlunos] = useState([])
  const [alunoSel, setAlunoSel] = useState(null)
  const [dadosAluno, setDadosAluno] = useState(null)
  const [tabAluno, setTabAluno] = useState(0)
  const [tabMenu, setTabMenu] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingAluno, setLoadingAluno] = useState(false)
  const [msgTexto, setMsgTexto] = useState('')
  const [novaTarefa, setNovaTarefa] = useState('')

  useEffect(() => { carregarAlunos() }, [])

  const carregarAlunos = async () => {
    setLoading(true)
    const r = await fetch('/api/mentor?action=overview')
    const d = await r.json()
    setAlunos(d.alunos || [])
    setLoading(false)
  }

  const abrirAluno = async (aluno) => {
    setAlunoSel(aluno)
    setTabAluno(0)
    setLoadingAluno(true)
    const r = await fetch(`/api/mentor?action=aluno&aluno_id=${aluno.id}`)
    const d = await r.json()
    setDadosAluno(d)
    setLoadingAluno(false)
  }

  const toggleAcesso = async () => {
    const novoAcesso = !dadosAluno.aluno.acesso_ativo
    await fetch('/api/mentor?action=acesso', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aluno_id: alunoSel.id, acesso_ativo: novoAcesso })
    })
    await abrirAluno(alunoSel)
  }

  const enviarMensagem = async () => {
    if (!msgTexto.trim()) return
    await fetch('/api/mentor?action=mensagem', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aluno_id: alunoSel.id, texto: msgTexto })
    })
    setMsgTexto('')
    await abrirAluno(alunoSel)
  }

  const adicionarTarefa = async () => {
    if (!novaTarefa.trim()) return
    await fetch('/api/mentor?action=tarefa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aluno_id: alunoSel.id, nome: novaTarefa, tipo: 'texto' })
    })
    setNovaTarefa('')
    await abrirAluno(alunoSel)
  }

  const atualizarEncontro = async (encontro_id, campos) => {
    await fetch('/api/mentor?action=encontro', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encontro_id, ...campos })
    })
    await abrirAluno(alunoSel)
  }

  const toggleFerramenta = async (ferramenta_id, habilitada) => {
    await fetch('/api/mentor?action=ferramenta', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aluno_id: alunoSel.id, ferramenta_id, habilitada })
    })
    await abrirAluno(alunoSel)
  }

  const s = {
    card: { background: '#111', border: '.5px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '16px', marginBottom: 10 },
    label: { fontSize: 10, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 },
    inp: { width: '100%', background: '#171717', border: '.5px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#f0ece4', fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box' },
  }

  // VISÃO OVERVIEW
  if (!alunoSel) {
    const MENU = ['Alunos', 'Mentorias']
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 40 }}>
        {/* Header */}
        <div style={{ background: '#0a0a0a', borderBottom: '.5px solid rgba(255,255,255,.07)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#c8a97a' }}>Portal Mentor</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#9a9590' }}>{user.nome}</div>
            <button onClick={onLogout} style={{ fontSize: 11, color: '#5a5550', background: 'none', border: 'none', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Alunos ativos', value: alunos.filter(a => a.acesso_ativo).length },
              { label: 'Total de alunos', value: alunos.length },
            ].map((item, i) => (
              <div key={i} style={s.card}>
                <div style={s.label}>{item.label}</div>
                <div style={{ fontSize: 28, color: '#c8a97a', fontFamily: "'Cormorant Garamond',serif" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Lista de alunos */}
          <div style={{ fontSize: 11, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Alunos</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : alunos.length === 0 ? (
            <div style={{ fontSize: 13, color: '#5a5550', textAlign: 'center', padding: 40 }}>Nenhum aluno ainda.</div>
          ) : (
            alunos.map(a => (
              <div key={a.id} onClick={() => abrirAluno(a)}
                style={{ ...s.card, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, color: '#f0ece4', marginBottom: 4 }}>{a.usuarios?.nome}</div>
                  <div style={{ fontSize: 11, color: '#9a9590' }}>{a.mentorias?.nome}</div>
                  <div style={{ fontSize: 11, color: '#5a5550', marginTop: 2 }}>{a.usuarios?.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: a.acesso_ativo ? 'rgba(100,200,100,.1)' : 'rgba(196,90,90,.1)', color: a.acesso_ativo ? '#64c864' : '#c45a5a', marginBottom: 6 }}>
                    {a.acesso_ativo ? 'Ativo' : 'Suspenso'}
                  </div>
                  <div style={{ fontSize: 11, color: '#5a5550' }}>{a.progresso || 0}%</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // VISÃO ALUNO
  const TABS_ALUNO = ['Controle', 'Ficha', 'Encontros', 'Tarefas', 'Mensagens', 'Financeiro']
  const { aluno, encontros, tarefas, mensagens, ferramentas, parcelas, alinhamento } = dadosAluno || {}

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 40 }}>
      {/* Header aluno */}
      <div style={{ background: '#0a0a0a', borderBottom: '.5px solid rgba(255,255,255,.07)', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button onClick={() => { setAlunoSel(null); setDadosAluno(null) }}
            style={{ fontSize: 18, color: '#c8a97a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
          <div>
            <div style={{ fontSize: 14, color: '#f0ece4' }}>{dadosAluno?.aluno?.usuarios?.nome || alunoSel.usuarios?.nome}</div>
            <div style={{ fontSize: 11, color: '#9a9590' }}>{alunoSel.mentorias?.nome}</div>
          </div>
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 0 }}>
          {TABS_ALUNO.map((t, i) => (
            <button key={i} onClick={() => setTabAluno(i)}
              style={{ padding: '8px 12px', fontSize: 11, color: tabAluno === i ? '#c8a97a' : '#5a5550', background: 'none', border: 'none', borderBottom: tabAluno === i ? '1.5px solid #c8a97a' : '1.5px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loadingAluno ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : (
          <>
            {/* CONTROLE */}
            {tabAluno === 0 && (
              <div>
                <div style={s.card}>
                  <div style={s.label}>Acesso ao portal</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div style={{ fontSize: 13, color: aluno?.acesso_ativo ? '#64c864' : '#c45a5a' }}>
                      {aluno?.acesso_ativo ? '● Ativo' : '● Suspenso'}
                    </div>
                    <button onClick={toggleAcesso}
                      style={{ fontSize: 12, background: aluno?.acesso_ativo ? 'rgba(196,90,90,.1)' : 'rgba(100,200,100,.1)', border: `.5px solid ${aluno?.acesso_ativo ? 'rgba(196,90,90,.3)' : 'rgba(100,200,100,.3)'}`, borderRadius: 8, padding: '6px 14px', color: aluno?.acesso_ativo ? '#c45a5a' : '#64c864', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      {aluno?.acesso_ativo ? 'Suspender' : 'Reativar'}
                    </button>
                  </div>
                </div>

                <div style={s.card}>
                  <div style={s.label}>Progresso</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, color: '#f0ece4' }}>{aluno?.mentorias?.nome}</div>
                    <div style={{ fontSize: 13, color: '#c8a97a' }}>{aluno?.progresso || 0}%</div>
                  </div>
                  <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2 }}>
                    <div style={{ height: 4, background: '#c8a97a', borderRadius: 2, width: `${aluno?.progresso || 0}%` }} />
                  </div>
                </div>

                {/* Ferramentas */}
                <div style={{ fontSize: 11, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Ferramentas</div>
                {ferramentas?.map(fa => (
                  <div key={fa.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: '#f0ece4' }}>{fa.ferramentas?.nome}</div>
                    <button onClick={() => toggleFerramenta(fa.ferramenta_id, !fa.habilitada)}
                      style={{ fontSize: 11, background: fa.habilitada ? 'rgba(100,200,100,.1)' : 'rgba(255,255,255,.05)', border: `.5px solid ${fa.habilitada ? 'rgba(100,200,100,.3)' : 'rgba(255,255,255,.1)'}`, borderRadius: 6, padding: '4px 10px', color: fa.habilitada ? '#64c864' : '#5a5550', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      {fa.habilitada ? 'Ativa' : 'Inativa'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* FICHA — ALINHAMENTO DE EXPECTATIVAS */}
            {tabAluno === 1 && (
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 16 }}>Alinhamento de Expectativas</div>
                {alinhamento ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Motivação', value: alinhamento.motivacao },
                      { label: 'Resultado esperado', value: alinhamento.resultado_esperado },
                      { label: 'Área de foco', value: alinhamento.area_foco },
                      { label: 'Grande desafio', value: alinhamento.grande_desafio },
                      { label: 'Principal obstáculo', value: alinhamento.obstaculo },
                      { label: 'Satisfação atual', value: alinhamento.satisfacao_atual ? `${alinhamento.satisfacao_atual}/10` : null },
                      { label: 'Tentativas anteriores', value: alinhamento.tentativas_anteriores },
                      { label: 'Comprometimento', value: alinhamento.comprometimento },
                      { label: 'Visão ideal', value: alinhamento.visao_ideal },
                      { label: 'Informação adicional', value: alinhamento.info_adicional },
                      { label: 'Telefone', value: alinhamento.telefone },
                    ].filter(item => item.value).map((item, i) => (
                      <div key={i} style={s.card}>
                        <div style={s.label}>{item.label}</div>
                        <div style={{ fontSize: 13, color: '#f0ece4', lineHeight: 1.6 }}>{item.value}</div>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: '#5a5550', textAlign: 'right' }}>
                      Preenchido em {new Date(alinhamento.preenchido_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#5a5550', textAlign: 'center', padding: 40 }}>
                    Aluno ainda não preencheu o alinhamento de expectativas.
                  </div>
                )}
              </div>
            )}

            {/* ENCONTROS */}
            {tabAluno === 2 && (
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 16 }}>Encontros</div>
                {encontros?.map(enc => (
                  <EncontroCard key={enc.id} enc={enc} onAtualizar={atualizarEncontro} s={s} />
                ))}
              </div>
            )}

            {/* TAREFAS */}
            {tabAluno === 3 && (
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 16 }}>Tarefas</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={novaTarefa} onChange={e => setNovaTarefa(e.target.value)}
                    placeholder="Nova tarefa para o aluno..."
                    onKeyDown={e => e.key === 'Enter' && adicionarTarefa()}
                    style={s.inp} />
                  <button onClick={adicionarTarefa}
                    style={{ background: '#c8a97a', border: 'none', borderRadius: 8, padding: '0 16px', color: '#0a0a0a', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
                    + Adicionar
                  </button>
                </div>
                {tarefas?.map(t => (
                  <div key={t.id} style={{ ...s.card, opacity: t.concluida ? .6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, color: '#f0ece4', textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.nome}</div>
                      <div style={{ fontSize: 11, color: t.concluida ? '#64c864' : '#5a5550' }}>{t.concluida ? '✓ Concluída' : 'Pendente'}</div>
                    </div>
                    {t.resposta && <div style={{ fontSize: 12, color: '#9a9590', marginTop: 6, lineHeight: 1.5 }}>{t.resposta}</div>}
                    {t.concluida_em && <div style={{ fontSize: 11, color: '#5a5550', marginTop: 4 }}>Concluída em {new Date(t.concluida_em).toLocaleDateString('pt-BR')}</div>}
                  </div>
                ))}
                {!tarefas?.length && <div style={{ fontSize: 13, color: '#5a5550', textAlign: 'center', padding: 30 }}>Nenhuma tarefa ainda.</div>}
              </div>
            )}

            {/* MENSAGENS */}
            {tabAluno === 4 && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {mensagens?.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: m.de === 'mentor' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '80%', background: m.de === 'mentor' ? 'rgba(200,169,122,.15)' : '#171717', border: `.5px solid ${m.de === 'mentor' ? 'rgba(200,169,122,.3)' : 'rgba(255,255,255,.07)'}`, borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: '#5a5550', marginBottom: 4 }}>{m.de === 'mentor' ? 'Você' : aluno?.usuarios?.nome?.split(' ')[0]}</div>
                        <div style={{ fontSize: 13, color: '#f0ece4', lineHeight: 1.5 }}>{m.texto}</div>
                      </div>
                    </div>
                  ))}
                  {!mensagens?.length && <div style={{ fontSize: 13, color: '#5a5550', textAlign: 'center', padding: 30 }}>Nenhuma mensagem ainda.</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea value={msgTexto} onChange={e => setMsgTexto(e.target.value)}
                    placeholder="Mensagem para o aluno..."
                    style={{ flex: 1, background: '#171717', border: '.5px solid rgba(255,255,255,.13)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f0ece4', fontFamily: "'DM Sans',sans-serif", resize: 'none', minHeight: 60, outline: 'none' }} />
                  <button onClick={enviarMensagem}
                    style={{ background: '#c8a97a', border: 'none', borderRadius: 10, padding: '0 16px', color: '#0a0a0a', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    Enviar
                  </button>
                </div>
              </div>
            )}

            {/* FINANCEIRO */}
            {tabAluno === 5 && (
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 16 }}>Financeiro</div>
                <div style={s.card}>
                  <div style={s.label}>Forma de pagamento</div>
                  <div style={{ fontSize: 13, color: '#f0ece4', textTransform: 'capitalize' }}>{aluno?.forma_pagamento || '—'}</div>
                </div>
                {aluno?.pagamento_status === 'negado' && (
                  <div style={{ background: 'rgba(196,90,90,.1)', border: '.5px solid rgba(196,90,90,.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: '#c45a5a' }}>⚠️ {aluno.pagamento_aviso}</div>
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Parcelas</div>
                {parcelas?.map(p => (
                  <div key={p.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#f0ece4' }}>Parcela {p.numero}</div>
                      <div style={{ fontSize: 12, color: '#9a9590' }}>R$ {Number(p.valor).toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div style={{ fontSize: 11, color: p.paga ? '#64c864' : '#c45a5a' }}>
                      {p.paga ? '✓ Paga' : 'Em aberto'}
                    </div>
                  </div>
                ))}
                {!parcelas?.length && <div style={{ fontSize: 13, color: '#5a5550', textAlign: 'center', padding: 20 }}>Sem parcelas registradas.</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EncontroCard({ enc, onAtualizar, s }) {
  const [editando, setEditando] = useState(false)
  const [resumo, setResumo] = useState(enc.resumo || '')
  const [data, setData] = useState(enc.proximo_agendado ? enc.proximo_agendado.slice(0, 16) : '')
  const [status, setStatus] = useState(enc.status)

  const salvar = async () => {
    await onAtualizar(enc.id, { resumo, status, proximo_agendado: data || null })
    setEditando(false)
  }

  return (
    <div style={{ ...s.card, borderColor: enc.status === 'nxt' ? 'rgba(200,169,122,.2)' : 'rgba(255,255,255,.07)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: '#5a5550' }}>Encontro {enc.numero}</div>
        <button onClick={() => setEditando(!editando)}
          style={{ fontSize: 11, color: '#c8a97a', background: 'none', border: 'none', cursor: 'pointer' }}>
          {editando ? 'Cancelar' : 'Editar'}
        </button>
      </div>
      <div style={{ fontSize: 14, color: '#f0ece4', marginBottom: 8 }}>{enc.nome}</div>

      {!editando ? (
        <>
          {enc.resumo && <div style={{ fontSize: 12, color: '#9a9590', lineHeight: 1.5, marginBottom: 6 }}>{enc.resumo}</div>}
          {enc.proximo_agendado && (
            <div style={{ fontSize: 11, color: '#c8a97a' }}>📅 {new Date(enc.proximo_agendado).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
          )}
          <div style={{ marginTop: 6, fontSize: 11, color: enc.status === 'done' ? '#64c864' : enc.status === 'nxt' ? '#c8a97a' : '#5a5550' }}>
            {enc.status === 'done' ? '✓ Concluído' : enc.status === 'nxt' ? '→ Próximo' : 'Pendente'}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...s.inp, padding: '6px 10px' }}>
            <option value="pend">Pendente</option>
            <option value="nxt">Próximo</option>
            <option value="done">Concluído</option>
          </select>
          <input type="datetime-local" value={data} onChange={e => setData(e.target.value)} style={{ ...s.inp, padding: '6px 10px' }} />
          <textarea value={resumo} onChange={e => setResumo(e.target.value)}
            placeholder="Resumo do encontro..."
            style={{ ...s.inp, minHeight: 70, resize: 'vertical' }} />
          <button onClick={salvar}
            style={{ background: '#c8a97a', border: 'none', borderRadius: 8, padding: '8px', color: '#0a0a0a', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Salvar
          </button>
        </div>
      )}
    </div>
  )
}
