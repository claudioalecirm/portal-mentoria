// api/asaas-saque.js
// Webhook de validação de saque do Asaas
// O Asaas envia um POST aqui antes de processar cada saque
// Respondemos com authorized: true para aprovar automaticamente
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  // Aprova todos os saques automaticamente
  // Se quiser adicionar lógica de aprovação manual no futuro, é aqui
  return res.status(200).json({ authorized: true })
}
