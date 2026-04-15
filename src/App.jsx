import { useState, useEffect } from 'react'
import Login from './pages/Login.jsx'
import DashAluno from './pages/DashAluno.jsx'
import DashMentor from './pages/DashMentor.jsx'
import Onboarding from './pages/Onboarding.jsx'
import PushNotification from './components/PushNotification.jsx'
import { registerPush } from './lib/usePush.js'

export default function App() {
  const [user, setUser] = useState(null)
  const [push, setPush] = useState(null)
  const [verificando, setVerificando] = useState(true)

  const isCadastroRoute = window.location.pathname === '/cadastro'

  useEffect(() => {
    if (isCadastroRoute) { setVerificando(false); return }
    const saved = localStorage.getItem('pm_user')
    if (saved) {
      const userData = JSON.parse(saved)
      verificarAcesso(userData).then(ativo => {
        if (ativo) setUser(userData)
        else { localStorage.removeItem('pm_user'); setUser(null) }
        setVerificando(false)
      })
    } else {
      setVerificando(false)
    }
  }, [])

  const verificarAcesso = async (userData) => {
    try {
      const res = await fetch('/api/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: userData.id, aluno_id: userData.aluno?.id || null })
      })
      const data = await res.json()
      return !data.bloqueado
    } catch { return true }
  }

  const handleLogin = async (userData) => {
    setUser(userData)
    localStorage.setItem('pm_user', JSON.stringify(userData))
    try { await registerPush(userData.id) } catch {}
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('pm_user')
  }

  const showPush = (title, body) => {
    setPush({ title, body, id: Date.now() })
    setTimeout(() => setPush(null), 6000)
  }

  if (isCadastroRoute) return <Onboarding />

  if (verificando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <>
      {push && <PushNotification {...push} onClose={() => setPush(null)} />}
      {!user && <Login onLogin={handleLogin} />}
      {user?.role === 'aluno' && <DashAluno user={user} onLogout={handleLogout} showPush={showPush} />}
      {user?.role === 'mentor' && <DashMentor user={user} onLogout={handleLogout} showPush={showPush} />}
    </>
  )
}
