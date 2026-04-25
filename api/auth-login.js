// api/auth-login.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  const { email, senha } = body
  if (!email || !senha) return res.status(400).json({ error: 'Dados incompletos' })

  // Busca usuário
  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, ativo, senha_hash')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !user) return res.status(401).json({ error: 'Email ou senha incorretos' })
  if (!user.ativo) return res.status(403).json({ error: 'Usuário inativo' })

  // Verifica senha — suporta os dois formatos
  const senhaEsperada = `${user.role}_hash_${senha}`
  const senhaValida = user.senha_hash === senhaEsperada || user.senha_hash === senha

  console.log('[login] email:', email, '| role:', user.role, '| hash esperado:', senhaEsperada, '| hash salvo:', user.senha_hash, '| válido:', senhaValida)

  if (!senhaValida) return res.status(401).json({ error: 'Email ou senha incorretos' })

  // Se aluno, verifica acesso ativo
  let alunoData = null
  if (user.role === 'aluno') {
    const { data: aluno } = await supabase
      .from('alunos')
      .select('*, mentorias(nome)')
      .eq('usuario_id', user.id)
      .single()

    if (aluno && !aluno.acesso_ativo) {
      return res.status(403).json({ error: 'Seu acesso está temporariamente suspenso. Entre em contato com seu mentor.' })
    }
    alunoData = aluno
  }

  res.status(200).json({
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    aluno: alunoData
  })
}
