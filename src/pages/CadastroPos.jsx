// src/pages/CadastroPos.jsx
// Página acessada pelo aluno após o pagamento para definir sua senha
// URL: /cadastro?token=EMAIL_ENCODED
import { useState, useEffect } from 'react'

export default function CadastroPos() {
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    // Pega email do query param
    const params = new URLSearchParams(window.location.search)
    const emailParam = params.get('email')
    if (emailParam) setEmail(decodeURIComponent(emailParam))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setErro('')

    try {
      const res = await fetch('/api/auth-definir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao definir senha'); return }
      setSucesso(true)
      setTimeout(() => window.location.href = '/', 3000)
    } catch { setErro('Erro de conexão.') } finally { setLoading(false) }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: 32, padding: '40px 20px',
      background: 'var(--bg)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: 'var(--amber)', fontWeight: 500 }}>
          Claudio Alecrim
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 4 }}>
          Portal de Mentoria
        </div>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 380, padding: '32px 28px' }}>
        {!sucesso ? (
          <>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, textAlign: 'center', marginBottom: 6 }}>
              Bem-vindo ao Portal
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
              Seu pagamento foi confirmado.<br/>Defina sua senha de acesso.
            </div>

            <form onSubmit={handleSubmit}>
              <div className="fg">
                <div className="fl">Seu e-mail</div>
                <input className="inp" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div className="fg">
                <div className="fl">Criar senha</div>
                <input className="inp" type="password" value={senha}
                  onChange={e => setSenha(e.target.value)} placeholder="mínimo 6 caracteres" required />
              </div>
              <div className="fg">
                <div className="fl">Confirmar senha</div>
                <input className="inp" type="password" value={confirmar}
                  onChange={e => setConfirmar(e.target.value)} placeholder="repita a senha" required />
              </div>
              {erro && <div className="error-msg" style={{ marginBottom: 10 }}>{erro}</div>}
              <button className="btn btn-amber btn-full" type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Acessar o Portal'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: 'var(--amber)', marginBottom: 8 }}>
              Senha definida com sucesso
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Redirecionando para o portal...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
