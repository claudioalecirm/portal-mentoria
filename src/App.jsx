import { useState, useEffect } from 'react'
import Login from './pages/Login.jsx'
import DashAluno from './pages/DashAluno.jsx'
import DashMentor from './pages/DashMentor.jsx'
import PushNotification from './components/PushNotification.jsx'
import { registerPush } from './lib/usePush.js'

export default function App() {
  const [user, setUser] = useState(null)
  const [push, setPush] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('pm_user')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  const handleLogin = async (userData) => {
    setUser(userData)
    localStorage.setItem('pm_user', JSON.stringify(userData))
    // Registra push após login
    try {
      await registerPush(userData.id)
    } catch {}
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('pm_user')
  }

  const showPush = (title, body, tag) => {
    setPush({ title, body, tag, id: Date.now() })
    setTimeout(() => setPush(null), 6000)
  }

  return (
    <>
      {push && <PushNotification {...push} onClose={() => setPush(null)} />}
      {!user && <Login onLogin={handleLogin} />}
      {user?.role === 'aluno' && (
        <DashAluno user={user} onLogout={handleLogout} showPush={showPush} />
      )}
      {user?.role === 'mentor' && (
        <DashMentor user={user} onLogout={handleLogout} showPush={showPush} />
      )}
    </>
  )
}
