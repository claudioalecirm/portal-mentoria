// src/components/mentor/MentorFerramentasAluno.jsx
// Usado na página do aluno no dashboard do mentor
// Permite habilitar/desabilitar cada ferramenta individualmente

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function MentorFerramentasAluno({ alunoId, nomeAluno }) {
  const [ferramentas, setFerramentas] = useState([])
  const [carregando, setCarregando]   = useState(true)
  const [salvando, setSalvando]       = useState(null) // id do que está sendo salvo

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
          descricao
        )
      `)
      .eq('aluno_id', alunoId)
      .order('habilitada', { ascending: false })

    if (!error && data) setFerramentas(data)
    setCarregando(false)
  }

  async function alternarFerramenta(vinculoId, novoEstado) {
    setSalvando(vinculoId)

    const { error } = await supabase
      .from('ferramentas_aluno')
      .update({ habilitada: novoEstado })
      .eq('id', vinculoId)

    if (!error) {
      setFerramentas(prev =>
        prev.map(f => f.id === vinculoId ? { ...f, habilitada: novoEstado } : f)
      )
    }
    setSalvando(null)
  }

  if (carregando) return (
    <div style={s.loading}>
      <div style={s.spinner} />
    </div>
  )

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.tag}>Ferramentas</span>
        <p style={s.subtitulo}>
          Habilite as ferramentas que {nomeAluno || 'o aluno'} poderá acessar no portal.
          Por padrão, todas chegam bloqueadas.
        </p>
      </div>

      <div style={s.lista}>
        {ferramentas.map(({ id, habilitada, ferramenta }) => (
          <div key={id} style={s.item}>
            <div style={s.itemInfo}>
              <div style={s.itemNome}>{ferramenta.nome}</div>
              {ferramenta.descricao && (
                <div style={s.itemDesc}>{ferramenta.descricao}</div>
              )}
            </div>

            <button
              style={{
                ...s.toggle,
                ...(habilitada ? s.toggleOn : s.toggleOff),
                ...(salvando === id ? s.toggleSalvando : {}),
              }}
              onClick={() => alternarFerramenta(id, !habilitada)}
              disabled={salvando === id}
              title={habilitada ? 'Clique para bloquear' : 'Clique para habilitar'}
            >
              <span style={{
                ...s.toggleBolinha,
                ...(habilitada ? s.toggleBolinhaOn : {}),
              }} />
              <span style={s.toggleLabel}>
                {salvando === id ? '...' : habilitada ? 'Liberada' : 'Bloqueada'}
              </span>
            </button>
          </div>
        ))}

        {ferramentas.length === 0 && (
          <div style={s.vazio}>Nenhuma ferramenta encontrada.</div>
        )}
      </div>
    </div>
  )
}

// ── ESTILOS ──────────────────────────────────────────────────
const s = {
  wrap: {
    padding: '0 0 24px',
  },
  header: {
    marginBottom: '20px',
  },
  tag: {
    fontSize: '10px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: '#c8a97a',
    display: 'block',
    marginBottom: '6px',
  },
  subtitulo: {
    fontSize: '13px',
    color: '#6b6055',
    lineHeight: 1.6,
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '14px 16px',
    background: '#111',
    border: '1px solid #1e1e1e',
    borderRadius: '8px',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemNome: {
    fontSize: '14px',
    color: '#e8e0d4',
    fontWeight: 500,
    marginBottom: '2px',
  },
  itemDesc: {
    fontSize: '12px',
    color: '#4a4035',
    lineHeight: 1.5,
  },
  toggle: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px 6px 6px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.5px',
  },
  toggleOn: {
    background: '#1a1510',
    color: '#c8a97a',
  },
  toggleOff: {
    background: '#161616',
    color: '#3a3530',
  },
  toggleSalvando: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  toggleBolinha: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#2a2a2a',
    transition: 'background 0.2s',
    flexShrink: 0,
  },
  toggleBolinhaOn: {
    background: '#c8a97a',
  },
  toggleLabel: {
    minWidth: '52px',
    textAlign: 'left',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 0',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #1e1e1e',
    borderTopColor: '#c8a97a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  vazio: {
    fontSize: '13px',
    color: '#3a3530',
    padding: '16px 0',
    textAlign: 'center',
  },
}
