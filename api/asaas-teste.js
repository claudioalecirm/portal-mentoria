// api/asaas-teste.js — diagnóstico completo
// Acesse: GET /api/asaas-teste?email=SEU_EMAIL_DO_CLIENTE_ASAAS&customer=ID_CLIENTE_ASAAS
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)
const ASAAS_URL = process.env.ASAAS_API_KEY?.includes('hmlg')
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

export default async function handler(req, res) {
  const log = []
  const { customer, email } = req.query

  log.push({ passo: '1_env', ASAAS_URL, tem_asaas_key: !!process.env.ASAAS_API_KEY, tem_resend_key: !!process.env.RESEND_API_KEY, tem_supabase: !!process.env.SUPABASE_URL })

  // Testa busca de cliente no Asaas
  if (customer) {
    try {
      const r = await fetch(`${ASAAS_URL}/customers/${customer}`, {
        headers: { 'access_token': process.env.ASAAS_API_KEY }
      })
      const c = await r.json()
      log.push({ passo: '2_asaas_cliente', status: r.status, nome: c.name, email: c.email, erro: c.errors || null })
    } catch (e) {
      log.push({ passo: '2_asaas_cliente', erro: e.message })
    }
  }

  // Testa envio de email
  if (email) {
    try {
      const result = await resend.emails.send({
        from: 'Claudio Alecrim <noreply@claudioalecrim.com.br>',
        to: email,
        subject: 'Teste de diagnóstico — Portal Mentoria',
        html: '<p>Email de teste enviado com sucesso pelo sistema de diagnóstico.</p>'
      })
      log.push({ passo: '3_email', resultado: result })
    } catch (e) {
      log.push({ passo: '3_email', erro: e.message })
    }
  }

  // Testa conexão Supabase
  try {
    const { data, error } = await supabase.from('usuarios').select('count').limit(1)
    log.push({ passo: '4_supabase', ok: !error, erro: error?.message })
  } catch (e) {
    log.push({ passo: '4_supabase', erro: e.message })
  }

  res.status(200).json({ diagnostico: log })
}
