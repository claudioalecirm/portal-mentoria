# Portal Mentoria — Claudio Alecrim

Portal completo de mentoria com dashboards para mentor e aluno, sistema de mensagens, tarefas, encontros e notificações via Web Push.

---

## DEPLOY EM 5 PASSOS

### 1. Supabase — Criar as tabelas

1. Acesse [supabase.com](https://supabase.com) → seu projeto
2. Vá em **SQL Editor** → **New Query**
3. Cole o conteúdo do arquivo `supabase-setup.sql`
4. Clique em **Run**
5. Copie a **service_role key** em: Settings → API → `service_role` (secret)

---

### 2. Gerar VAPID Keys (Web Push)

No terminal do seu computador (precisa ter Node instalado):

```bash
npx web-push generate-vapid-keys
```

Guarde as duas chaves geradas (public e private).

---

### 3. GitHub — Criar o repositório

1. Acesse [github.com](https://github.com) → **New repository**
2. Nome: `portal-mentoria`
3. Deixe vazio (sem README)
4. Execute no terminal:

```bash
cd portal-mentoria
git init
git add .
git commit -m "feat: portal mentoria completo"
git remote add origin https://github.com/SEU_USUARIO/portal-mentoria.git
git push -u origin main
```

---

### 4. Vercel — Deploy

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório `portal-mentoria`
3. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://lymmzhslhwidqcztcfsn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_VlqGtbXSK-Hofl0ROjSzSQ_LwOtSX-a` |
| `SUPABASE_URL` | `https://lymmzhslhwidqcztcfsn.supabase.co` |
| `SUPABASE_SERVICE_KEY` | sua service_role key do Supabase |
| `RESEND_API_KEY` | sua chave do Resend |
| `VITE_VAPID_PUBLIC_KEY` | chave pública VAPID gerada |
| `VAPID_PUBLIC_KEY` | chave pública VAPID gerada |
| `VAPID_PRIVATE_KEY` | chave privada VAPID gerada |
| `VITE_APP_URL` | `https://portal-mentoria.vercel.app` |

4. Clique em **Deploy**

---

### 5. Domínio personalizado

1. No Vercel: **Settings → Domains**
2. Adicione: `dash.claudioalecrim.com.br`
3. No painel DNS do seu domínio, adicione o registro CNAME apontando para `cname.vercel-dns.com`

---

## CREDENCIAIS INICIAIS

| Usuário | Email | Senha |
|---|---|---|
| Mentor | `mentor@ca.com` | `1234` |
| Aluno (teste) | `ricardo@email.com` | `2345` |

**Para adicionar alunos reais:** insira via Supabase → Table Editor → `usuarios` + `alunos`

---

## ESTRUTURA

```
portal-mentoria/
├── api/                    # Vercel Functions (backend)
│   ├── auth-login.js
│   ├── auth-recuperar.js
│   ├── aluno.js
│   ├── mentor.js
│   ├── push-subscribe.js
│   └── push-send.js
├── public/
│   ├── sw.js               # Service Worker (Web Push)
│   └── manifest.json       # PWA manifest
├── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── DashAluno.jsx
│   │   └── DashMentor.jsx
│   ├── components/
│   │   ├── Mensagens.jsx
│   │   └── PushNotification.jsx
│   ├── lib/
│   │   ├── supabase.js
│   │   └── usePush.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase-setup.sql      # Execute isso no Supabase primeiro
├── .env.example            # Modelo das variáveis de ambiente
└── vercel.json
```
