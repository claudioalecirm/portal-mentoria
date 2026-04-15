// src/pages/Onboarding.jsx
// Página acessada via link pós-pagamento: /cadastro?token=XXX
// Combina Alinhamento de Expectativas + criação de senha em um único fluxo
import { useState, useEffect } from 'react'

const STEPS = ['Boas-vindas', 'Sobre Você', 'Sua Jornada', 'Seu Comprometimento', 'Acesso']

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [token, setToken] = useState('')
  const [dadosToken, setDadosToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [form, setForm] = useState({
    telefone: '',
    motivacao: '',
    resultado_esperado: '',
    area_foco: 'Vida profissional / carreira',
    grande_desafio: '',
    obstaculo: '',
    satisfacao_atual: 5,
    tentativas_anteriores: '',
    comprometimento: 'Estou disposto a aplicar o que for necessário',
    visao_ideal: '',
    info_adicional: '',
    senha: '',
    confirmar_senha: ''
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (!t) { setErro('Link inválido. Verifique seu email.'); setLoading(false); return }
    setToken(t)
    fetch(`/api/onboarding?action=validar&token=${t}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setErro(data.ja_concluido ? 'Este cadastro já foi concluído. Acesse o portal com seu email e senha.' : data.error)
        else setDadosToken(data)
      })
      .catch(() => setErro('Erro de conexão. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [])

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const avancar = () => {
    setErro('')
    if (step === 0) { setStep(1); return }
    if (step === 1 && !form.telefone) { setErro('Informe seu telefone.'); return }
    if (step === 2 && !form.motivacao) { setErro('Preencha sua motivação.'); return }
    if (step === 3 && !form.visao_ideal) { setErro('Descreva sua visão ideal.'); return }
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }

  const enviar = async () => {
    if (form.senha !== form.confirmar_senha) { setErro('As senhas não coincidem.'); return }
    if (form.senha.length < 6) { setErro('Senha deve ter mínimo 6 caracteres.'); return }
    setEnviando(true); setErro('')
    try {
      const res = await fetch('/api/onboarding?action=cadastrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form })
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao finalizar cadastro.'); return }
      setSucesso(true)
      setTimeout(() => window.location.href = '/', 3000)
    } catch { setErro('Erro de conexão. Tente novamente.') }
    finally { setEnviando(false) }
  }

  const inputStyle = { width: '100%', background: '#171717', border: '.5px solid rgba(255,255,255,.13)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f0ece4', fontFamily: "'DM Sans', sans-serif", outline: 'none', marginTop: 4 }
  const labelStyle = { fontSize: 11, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 4 }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
      <div style={{ width: 24, height: 24, border: '2px solid rgba(200,169,122,.3)', borderTopColor: '#c8a97a', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
    </div>
  )

  if (sucesso) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', padding: 24 }}>
      <div style={{ background: '#111', border: '.5px solid rgba(200,169,122,.2)', borderRadius: 16, padding: '40px 32px', textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#c8a97a', marginBottom: 8 }}>Cadastro concluído!</div>
        <div style={{ fontSize: 13, color: '#9a9590', lineHeight: 1.6 }}>Você receberá um email de confirmação. Redirecionando para o portal...</div>
      </div>
    </div>
  )

  if (erro && !dadosToken) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', padding: 24 }}>
      <div style={{ background: '#111', border: '.5px solid rgba(196,90,90,.3)', borderRadius: 16, padding: '40px 32px', textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 13, color: '#c45a5a', marginBottom: 16 }}>{erro}</div>
        <a href="/" style={{ fontSize: 12, color: '#c8a97a' }}>← Ir para o portal</a>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus,textarea:focus,select:focus{border-color:rgba(200,169,122,.4)!important;outline:none}`}</style>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: '#c8a97a', fontWeight: 500 }}>Claudio Alecrim</div>
        <div style={{ fontSize: 10, color: '#5a5550', letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 4 }}>Alinhamento de Expectativas</div>
      </div>

      {/* Progresso */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ width: i <= step ? 28 : 8, height: 4, borderRadius: 2, background: i <= step ? '#c8a97a' : '#2a2a2a', transition: 'all .3s' }} />
        ))}
      </div>

      <div style={{ background: '#111', border: '.5px solid rgba(255,255,255,.07)', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 460 }}>

        {/* STEP 0 — Boas-vindas */}
        {step === 0 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#f0ece4', marginBottom: 8 }}>
              Olá, {dadosToken?.nome?.split(' ')[0]}!
            </div>
            <div style={{ fontSize: 13, color: '#9a9590', lineHeight: 1.7, marginBottom: 20 }}>
              Seu pagamento da <span style={{ color: '#c8a97a' }}>{dadosToken?.mentoria}</span> foi confirmado.
            </div>
            <div style={{ fontSize: 13, color: '#9a9590', lineHeight: 1.7, marginBottom: 20 }}>
              Antes de acessar o portal, preciso que você responda algumas perguntas.
              Elas vão me ajudar a conduzir o processo de forma estratégica e direcionada para o seu momento.
            </div>
            <div style={{ fontSize: 13, color: '#9a9590', lineHeight: 1.7 }}>
              Leva menos de 5 minutos. Responda com sinceridade.
            </div>
          </div>
        )}

        {/* STEP 1 — Sobre Você */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 4 }}>Sobre Você</div>
            <div>
              <label style={labelStyle}>Telefone / WhatsApp</label>
              <input style={inputStyle} placeholder="(00) 00000-0000" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>O que motivou você a entrar em um processo de mentoria agora?</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }} placeholder="Seja específico sobre seu momento atual..." value={form.motivacao} onChange={e => set('motivacao', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Qual área da sua vida quer desenvolver com mais foco?</label>
              <select style={inputStyle} value={form.area_foco} onChange={e => set('area_foco', e.target.value)}>
                <option>Vida profissional / carreira</option>
                <option>Casamento / relacionamento</option>
                <option>Finanças</option>
                <option>Família</option>
                <option>Propósito / identidade</option>
                <option>Espiritualidade</option>
                <option>Saúde</option>
                <option>Outro</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 2 — Sua Jornada */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 4 }}>Sua Jornada</div>
            <div>
              <label style={labelStyle}>Qual é o principal resultado que você espera alcançar?</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.5 }} placeholder="Seja objetivo e específico..." value={form.resultado_esperado} onChange={e => set('resultado_esperado', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Se pudesse resolver apenas um grande desafio hoje, qual seria?</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.5 }} placeholder="O principal ponto que precisa mudar..." value={form.grande_desafio} onChange={e => set('grande_desafio', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>O que você acredita que tem sido o maior obstáculo para avançar?</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.5 }} placeholder="Seja honesto consigo mesmo..." value={form.obstaculo} onChange={e => set('obstaculo', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Como você avalia sua satisfação atual nessa área? ({form.satisfacao_atual}/10)</label>
              <input type="range" min="0" max="10" value={form.satisfacao_atual} onChange={e => set('satisfacao_atual', e.target.value)}
                style={{ width: '100%', marginTop: 8, accentColor: '#c8a97a' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#5a5550', marginTop: 4 }}>
                <span>0 — insatisfeito</span><span>10 — pleno</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Seu Comprometimento */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 4 }}>Seu Comprometimento</div>
            <div>
              <label style={labelStyle}>Você já tentou mudar ou melhorar essa área antes? Como foi?</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.5 }} placeholder="O que tentou e o que aprendeu com isso..." value={form.tentativas_anteriores} onChange={e => set('tentativas_anteriores', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Qual é o seu nível de comprometimento?</label>
              {['Estou curioso para aprender mais', 'Estou disposto a aplicar o que for necessário', 'Estou realmente decidido a mudar o que for preciso'].map(op => (
                <div key={op} onClick={() => set('comprometimento', op)}
                  style={{ padding: '10px 14px', marginTop: 6, background: form.comprometimento === op ? 'rgba(200,169,122,.15)' : '#171717', border: `.5px solid ${form.comprometimento === op ? '#c8a97a' : 'rgba(255,255,255,.1)'}`, borderRadius: 8, fontSize: 13, color: form.comprometimento === op ? '#c8a97a' : '#9a9590', cursor: 'pointer', transition: 'all .2s' }}>
                  {op}
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Se ao final dessa mentoria sua vida estivesse no nível que você deseja, como ela seria?</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }} placeholder="Descreva com detalhes sua visão..." value={form.visao_ideal} onChange={e => set('visao_ideal', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Existe algo importante que eu deveria saber antes de iniciarmos? (opcional)</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical', lineHeight: 1.5 }} placeholder="Contexto, situações específicas, pedidos especiais..." value={form.info_adicional} onChange={e => set('info_adicional', e.target.value)} />
            </div>
          </div>
        )}

        {/* STEP 4 — Acesso */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#f0ece4', marginBottom: 4 }}>Criar sua Senha</div>
            <div style={{ fontSize: 13, color: '#9a9590', lineHeight: 1.6, marginBottom: 4 }}>
              Seu login será: <span style={{ color: '#c8a97a' }}>{dadosToken?.email}</span>
            </div>
            <div>
              <label style={labelStyle}>Criar senha (mínimo 6 caracteres)</label>
              <input type="password" style={inputStyle} placeholder="••••••••" value={form.senha} onChange={e => set('senha', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Confirmar senha</label>
              <input type="password" style={inputStyle} placeholder="••••••••" value={form.confirmar_senha} onChange={e => set('confirmar_senha', e.target.value)} />
            </div>
          </div>
        )}

        {erro && <div style={{ fontSize: 12, color: '#c45a5a', marginTop: 14 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: '10px 18px', background: 'none', border: '.5px solid rgba(255,255,255,.13)', borderRadius: 10, color: '#9a9590', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              ← Voltar
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={avancar}
              style={{ flex: 1, padding: '11px', background: 'rgba(200,169,122,.12)', border: '.5px solid rgba(200,169,122,.4)', borderRadius: 10, color: '#c8a97a', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              Continuar →
            </button>
          ) : (
            <button onClick={enviar} disabled={enviando}
              style={{ flex: 1, padding: '11px', background: '#c8a97a', border: 'none', borderRadius: 10, color: '#0a0a0a', fontSize: 13, fontWeight: 600, cursor: enviando ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", opacity: enviando ? .7 : 1 }}>
              {enviando ? 'Finalizando...' : 'Acessar o Portal'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
