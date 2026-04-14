import { useState } from 'react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [recuperar, setRecuperar] = useState(false)
  const [recEmail, setRecEmail] = useState('')
  const [recMsg, setRecMsg] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Credenciais inválidas'); return }
      onLogin(data)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecuperar = async () => {
    if (!recEmail) return
    setLoading(true)
    try {
      await fetch('/api/auth-recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recEmail })
      })
      setRecMsg('Se esse email estiver cadastrado, você receberá as instruções em instantes.')
    } catch {
      setRecMsg('Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: 36, padding: '40px 20px',
      background: 'var(--bg)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: 'var(--amber)', fontWeight: 500, letterSpacing: '.05em' }}>
          Claudio Alecrim
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 4 }}>
          Portal de Mentoria
        </div>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '32px 28px' }}>
        {!recuperar ? (
          <>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, textAlign: 'center', marginBottom: 6 }}>Acesso</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', marginBottom: 22 }}>Entre com suas credenciais</div>
            <form onSubmit={handleLogin}>
              <div className="fg">
                <div className="fl">E-mail</div>
                <input className="inp" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="fg">
                <div className="fl">Senha</div>
                <input className="inp" type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} required />
              </div>
              <button className="btn btn-amber btn-full" type="submit" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              {erro && <div className="error-msg">{erro}</div>}
            </form>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <span
                style={{ fontSize: 11, color: 'var(--text3)', cursor: 'pointer', borderBottom: '.5px solid var(--text3)', paddingBottom: 1 }}
                onClick={() => setRecuperar(true)}
              >
                Esqueci minha senha
              </span>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, textAlign: 'center', marginBottom: 6 }}>Recuperar Acesso</div>
            {!recMsg ? (
              <>
                <div className="fg" style={{ marginTop: 16 }}>
                  <div className="fl">E-mail cadastrado</div>
                  <input className="inp" type="email" placeholder="seu@email.com" value={recEmail} onChange={e => setRecEmail(e.target.value)} />
                </div>
                <button className="btn btn-amber btn-full" onClick={handleRecuperar} disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar acesso por e-mail'}
                </button>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.6, marginTop: 16 }}>{recMsg}</div>
            )}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', cursor: 'pointer' }} onClick={() => { setRecuperar(false); setRecMsg('') }}>
                ← Voltar ao login
              </span>
            </div>
          </>
        )}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text3)' }}>dash.claudioalecrim.com.br</div>
    </div>
  )
}
