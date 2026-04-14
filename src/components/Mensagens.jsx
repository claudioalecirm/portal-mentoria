import { useState, useEffect, useRef } from 'react'

export default function Mensagens({ alunoId, perspectiva, onNovaMensagem }) {
  const [msgs, setMsgs] = useState([])
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  const carregar = async () => {
    try {
      const res = await fetch(`/api/aluno?action=dados&aluno_id=${alunoId}`)
      const data = await res.json()
      if (data.mensagens) setMsgs(data.mensagens)
      // Marca como lidas
      await fetch('/api/aluno?action=mensagens-lidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aluno_id: alunoId, de: perspectiva === 'mentor' ? 'aluno' : 'mentor' })
      })
    } catch {}
  }

  useEffect(() => {
    carregar()
    const interval = setInterval(carregar, 10000) // polling a cada 10s
    return () => clearInterval(interval)
  }, [alunoId])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [msgs])

  const enviar = async () => {
    if (!texto.trim() || loading) return
    setLoading(true)
    const t = texto.trim()
    setTexto('')
    try {
      const res = await fetch('/api/aluno?action=mensagem-enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aluno_id: alunoId, de: perspectiva, texto: t })
      })
      const data = await res.json()
      if (data.mensagem) {
        setMsgs(prev => [...prev, data.mensagem])
        onNovaMensagem?.(data.mensagem)
      }
    } catch {} finally { setLoading(false) }
  }

  const nowStr = () => {
    const d = new Date()
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' · ' +
           d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatTs = (ts) => {
    try {
      const d = new Date(ts)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' · ' +
             d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  return (
    <div className="card">
      <div className="card-title">Mensagens</div>
      <div className="card-sub">{perspectiva === 'aluno' ? 'Conversa com seu mentor' : 'Histórico de comunicação'}</div>

      <div className="msg-list" ref={listRef}>
        {msgs.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 20 }}>
            Nenhuma mensagem ainda.
          </div>
        )}
        {msgs.map((m, i) => {
          const isPropio = m.de === perspectiva
          return (
            <div key={m.id || i} style={{ display: 'flex', justifyContent: isPropio ? 'flex-end' : 'flex-start' }}>
              <div className={`msg-bubble ${m.de === 'aluno' ? 'msg-aluno' : 'msg-mentor'}`}>
                {m.texto}
                <div className="msg-meta">{formatTs(m.criado_em)}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="divider" />
      <div className="msg-compose">
        <textarea
          className="inp"
          style={{ minHeight: 50, flex: 1, fontSize: 12 }}
          placeholder={perspectiva === 'aluno' ? 'Escreva uma mensagem...' : 'Responder ao aluno...'}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
        />
        <button className="btn btn-amber" style={{ padding: '8px 14px', flexShrink: 0 }} onClick={enviar} disabled={loading}>
          {loading ? '...' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
