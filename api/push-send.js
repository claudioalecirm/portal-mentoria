// api/push-send.js
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

webpush.setVapidDetails(
  'mailto:contato@claudioalecrim.com.br',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { usuario_id, title, body, tag, url } = req.body
  if (!usuario_id || !title) return res.status(400).json({ error: 'Dados incompletos' })

  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('*')
    .eq('usuario_id', usuario_id)

  if (error) return res.status(500).json({ error: error.message })
  if (!tokens || tokens.length === 0) return res.status(200).json({ ok: true, sent: 0 })

  const payload = JSON.stringify({ title, body, tag: tag || 'portal', url: url || '/' })
  let sent = 0
  for (const token of tokens) {
    try {
      await webpush.sendNotification(
        { endpoint: token.endpoint, keys: { p256dh: token.p256dh, auth: token.auth } },
        payload
      )
      sent++
    } catch (err) {
      // token expirado — remove
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_tokens').delete().eq('id', token.id)
      }
    }
  }
  res.status(200).json({ ok: true, sent })
}
