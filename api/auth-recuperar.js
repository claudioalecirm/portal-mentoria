// api/auth-recuperar.js
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email obrigatório' })

  const { data: user } = await supabase
    .from('usuarios')
    .select('id, nome, email, senha_hash')
    .eq('email', email.toLowerCase().trim())
    .single()

  // Sempre retorna 200 por segurança (não revela se email existe)
  if (!user) return res.status(200).json({ ok: true })

  await resend.emails.send({
    from: 'Portal CA <noreply@claudioalecrim.com.br>',
    to: user.email,
    subject: 'Seu acesso ao Portal de Mentoria',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f0ece4;border-radius:12px">
        <div style="font-family:Georgia,serif;font-size:22px;color:#c8a97a;margin-bottom:24px">Claudio Alecrim</div>
        <p style="font-size:15px;margin-bottom:16px">Olá, <strong>${user.nome}</strong>.</p>
        <p style="font-size:14px;color:#9a9590;margin-bottom:24px">Seu acesso ao Portal de Mentoria:</p>
        <div style="background:#171717;border-radius:8px;padding:16px;margin-bottom:24px">
          <p style="font-size:12px;color:#5a5550;margin-bottom:4px">E-mail</p>
          <p style="font-size:14px;color:#f0ece4;margin-bottom:12px">${user.email}</p>
          <p style="font-size:12px;color:#5a5550;margin-bottom:4px">Senha temporária</p>
          <p style="font-size:18px;font-weight:bold;color:#c8a97a;letter-spacing:.1em">REDEFINIR</p>
        </div>
        <a href="${process.env.VITE_APP_URL || 'https://portal-mentoria.vercel.app'}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:12px 24px;border-radius:8px;text-align:center;font-weight:500;font-size:14px">Acessar o Portal</a>
        <p style="font-size:11px;color:#5a5550;margin-top:24px;text-align:center">Se não solicitou, ignore este email.</p>
      </div>
    `
  })

  res.status(200).json({ ok: true })
}
