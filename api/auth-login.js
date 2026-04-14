// api/auth-login.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, senha } = req.body
  if (!email || !senha) return res.status(400).json({ error: 'Dados incompletos' })

  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, ativo, senha_hash')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !user) return res.status(401).json({ error: 'Credenciais inválidas' })
  if (!user.ativo) return res.status(403).json({ error: 'Acesso desabilitado' })

  // Em produção: bcrypt.compare(senha, user.senha_hash)
  // Para validação inicial usamos hash simples
  const senhaValida = user.senha_hash === `${user.role}_hash_${senha}` || user.senha_hash === senha
  if (!senhaValida) return res.status(401).json({ error: 'Credenciais inválidas' })

  // Busca dados do aluno se for aluno
  let alunoData = null
  if (user.role === 'aluno') {
    const { data: aluno } = await supabase
      .from('alunos')
      .select('*, mentorias(nome)')
      .eq('usuario_id', user.id)
      .single()
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
