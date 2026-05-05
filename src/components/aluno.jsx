// src/components/aluno/AlunoFerramentas.jsx
// Substitui ou adiciona na página do aluno no portal-mentoria
// Busca ferramentas do aluno no Supabase e exibe com estado bloqueado/disponível

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AlunoFerramentas({ alunoId }) {
  const [ferramentas, setFerramentas] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarFerramentas()
  }, [alunoId])

  async function buscarFerramentas() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('ferramentas_aluno')
      .select(`
        id,
        habilitada,
        ferramenta:ferramenta_id (
          id,
          nome,
          descricao,
          url
        )
      `)
      .eq('aluno_id', alunoId)
      .order('habilitada', { ascending: false }) // habilitadas primeiro

    if (!error && data) setFerramentas(data)
    setCarregando(false)
  }

  function abrirFerramenta(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (carregando) return (
    <div style={s.loading}>
      <div style={s.spinner} />
    </div>
  )

  const habilitadas = ferramentas.filter(f => f.habilitada)
  const bloqueadas  = ferramentas.filter(f => !f.habilitada)

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.tag}>Ferramentas</span>
        <h2 style={s.titulo}>Diagnósticos</h2>
        <p style={s.subtitulo}>
          Ferramentas disponibilizadas pelo seu mentor para aprofundar o processo.
        </p>
      </div>

      {/* HABILITADAS */}
      {habilitadas.length > 0 && (
        <div style={s.secao}>
          {habilitadas.map(({ id, ferramenta }) => (
            <div key={id} style={s.card} onClick={() => abrirFerramenta(ferramenta.url)}>
              <div style={s.cardIcone}>
                <IconeAtivo />
              </div>
              <div style={s.cardConteudo}>
                <div style={s.cardNome}>{ferramenta.nome}</div>
                {ferramenta.descricao && (
                  <div style={s.cardDesc}>{ferramenta.descricao}</div>
                )}
              </div>
              <div style={s.cardSeta}>→</div>
            </div>
          ))}
        </div>
      )}

      {/* BLOQUEADAS */}
      {bloqueadas.length > 0 && (
        <div style={s.secao}>
          {habilitadas.length > 0 && (
            <div style={s.divisorLabel}>Aguardando liberação</div>
          )}
          {bloqueadas.map(({ id, ferramenta }) => (
            <div key={id} style={{ ...s.card, ...s.cardBloqueado }}>
              <div style={{ ...s.cardIcone, ...s.cardIconeBloqueado }}>
                <IconeBloqueado />
              </div>
              <div style={s.cardConteudo}>
                <div style={{ ...s.cardNome, ...s.cardNomeBloqueado }}>{ferramenta.nome}</div>
                {ferramenta.descricao && (
                  <div style={s.cardDesc}>{ferramenta.descricao}</div>
                )}
              </div>
              <div style={{ ...s.cardSeta, ...s.cardSetaBloqueada }}>
                <IconeCadeado />
              </div>
            </div>
          ))}
        </div>
      )}

      {ferramentas.length === 0 && (
        <div style={s.vazio}>
          Nenhuma ferramenta cadastrada ainda.
        </div>
      )}
    </div>
  )
}

// ── ÍCONES ──────────────────────────────────────────────────
function IconeAtivo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#c8a97a" strokeWidth="1.2"/>
      <path d="M5 8l2 2 4-4" stroke="#c8a97a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconeBloqueado() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="#3a3530" strokeWidth="1.2"/>
      <path d="M5 6V4.5a2 2 0 014 0V6" stroke="#3a3530" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}
function IconeCadeado() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="#3a3530" strokeWidth="1.2"/>
      <path d="M5 6V4.5a2 2 0 014 0V6" stroke="#3a3530" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

// ── ESTILOS ──────────────────────────────────────────────────
const s = {
  wrap: {
    padding: '0 0 32px',
  },
  header: {
    marginBottom: '24px',
  },
  tag: {
    fontFamily: 'var(--font-body, DM Sans, sans-serif)',
    fontSize: '10px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: '#c8a97a',
    display: 'block',
    marginBottom: '6px',
  },
  titulo: {
    fontFamily: 'var(--font-disp, Cormorant Garamond, serif)',
    fontSize: '24px',
    fontWeight: 300,
    color: '#e8e0d4',
    marginBottom: '6px',
  },
  subtitulo: {
    fontSize: '14px',
    color: '#6b6055',
    lineHeight: 1.6,
  },
  secao: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '8px',
  },
  divisorLabel: {
    fontSize: '10px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#3a3530',
    marginTop: '12px',
    marginBottom: '4px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px 18px',
    background: '#111',
    border: '1px solid #1e1e1e',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
  },
  cardBloqueado: {
    cursor: 'default',
    opacity: 0.5,
  },
  cardIcone: {
    flexShrink: 0,
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#1a1510',
    border: '1px solid #2a2010',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconeBloqueado: {
    background: '#111',
    border: '1px solid #1e1e1e',
  },
  cardConteudo: {
    flex: 1,
    minWidth: 0,
  },
  cardNome: {
    fontSize: '15px',
    color: '#e8e0d4',
    fontWeight: 500,
    marginBottom: '2px',
  },
  cardNomeBloqueado: {
    color: '#3a3530',
  },
  cardDesc: {
    fontSize: '12px',
    color: '#5a4a3a',
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardSeta: {
    flexShrink: 0,
    fontSize: '16px',
    color: '#c8a97a',
  },
  cardSetaBloqueada: {
    color: '#2a2a2a',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 0',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #1e1e1e',
    borderTopColor: '#c8a97a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  vazio: {
    fontSize: '14px',
    color: '#3a3530',
    padding: '20px 0',
    textAlign: 'center',
  },
}
