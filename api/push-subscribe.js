// api/push-subscribe.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { usuario_id, endpoint, p256dh, auth } = req.body
  if (!usuario_id || !endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'Dados incompletos' })
  }
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ usuario_id, endpoint, p256dh, auth }, { onConflict: 'usuario_id,endpoint' })
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ ok: true })
}
