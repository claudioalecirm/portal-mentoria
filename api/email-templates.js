// email-templates.js — templates de email centralizados

const APP_URL = process.env.VITE_APP_URL || 'https://portal-mentoria.vercel.app'

export function emailOnboarding(nome, mentoria, linkCadastro) {
  return {
    subject: `Bem-vindo à ${mentoria} — Complete seu cadastro`,
    html: `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:0;background:#f5f5f5">
      <!-- Header -->
      <div style="background:#0a0a0a;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-family:Georgia,serif;font-size:26px;color:#c8a97a;font-weight:500;letter-spacing:.05em">Claudio Alecrim</div>
        <div style="font-size:11px;color:#5a5550;letter-spacing:.2em;text-transform:uppercase;margin-top:4px">Portal de Mentoria</div>
      </div>
      <!-- Body -->
      <div style="background:#ffffff;padding:36px 40px">
        <p style="font-size:16px;color:#111;margin-bottom:8px">Olá, <strong>${nome}</strong>!</p>
        <p style="font-size:14px;color:#555;margin-bottom:24px;line-height:1.7">
          Seu pagamento da <strong style="color:#c8a97a">${mentoria}</strong> foi confirmado. 
          Estou animado para iniciarmos essa jornada juntos.
        </p>

        <!-- Passo 1 -->
        <div style="background:#fafafa;border-left:3px solid #c8a97a;padding:16px 20px;margin-bottom:16px;border-radius:0 8px 8px 0">
          <div style="font-size:12px;font-weight:600;color:#c8a97a;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Passo 1 — Complete seu cadastro</div>
          <p style="font-size:13px;color:#555;margin:0 0 12px;line-height:1.6">
            Clique no botão abaixo para preencher o formulário de alinhamento de expectativas e criar sua senha de acesso.
          </p>
          <a href="${linkCadastro}" style="display:inline-block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:13px">
            Completar meu cadastro →
          </a>
          <p style="font-size:11px;color:#999;margin:10px 0 0">Este link é pessoal e expira em 7 dias.</p>
        </div>

        <!-- Passo 2 -->
        <div style="background:#fafafa;border-left:3px solid #e0e0e0;padding:16px 20px;margin-bottom:24px;border-radius:0 8px 8px 0">
          <div style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Passo 2 — Acesse o portal sempre que quiser</div>
          <p style="font-size:13px;color:#555;margin:0 0 12px;line-height:1.6">
            Após concluir o cadastro, você pode acessar sua área do aluno a qualquer momento pelo endereço abaixo. 
            Salve este email ou adicione o link aos seus favoritos.
          </p>
          <div style="background:#111;border-radius:6px;padding:12px 16px;display:inline-block">
            <a href="${APP_URL}" style="color:#c8a97a;font-size:14px;font-weight:500;text-decoration:none;letter-spacing:.02em">${APP_URL}</a>
          </div>
          <p style="font-size:13px;color:#555;margin:12px 0 0;line-height:1.6">
            <strong>Login:</strong> seu e-mail cadastrado<br/>
            <strong>Senha:</strong> a que você vai criar no passo 1
          </p>
        </div>

        <p style="font-size:13px;color:#888;line-height:1.6;border-top:1px solid #eee;padding-top:20px;margin-top:8px">
          Qualquer dúvida, basta responder este email.<br/>
          Em breve entro em contato para agendarmos o primeiro encontro.
        </p>
      </div>
      <!-- Footer -->
      <div style="background:#0a0a0a;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center">
        <p style="font-size:11px;color:#5a5550;margin:0">
          © Claudio Alecrim · <a href="https://claudioalecrim.com.br" style="color:#5a5550">claudioalecrim.com.br</a>
        </p>
      </div>
    </div>
    `
  }
}

export function emailAcessoPortal(nome, mentoria) {
  return {
    subject: `Seu acesso ao Portal de Mentoria`,
    html: `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:0;background:#f5f5f5">
      <div style="background:#0a0a0a;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-family:Georgia,serif;font-size:26px;color:#c8a97a;font-weight:500">Claudio Alecrim</div>
        <div style="font-size:11px;color:#5a5550;letter-spacing:.2em;text-transform:uppercase;margin-top:4px">Portal de Mentoria</div>
      </div>
      <div style="background:#ffffff;padding:36px 40px">
        <p style="font-size:16px;color:#111;margin-bottom:8px">Olá, <strong>${nome}</strong>!</p>
        <p style="font-size:14px;color:#555;margin-bottom:24px;line-height:1.7">
          Seu cadastro na <strong style="color:#c8a97a">${mentoria}</strong> está completo. 
          Aqui estão seus dados de acesso para guardar:
        </p>

        <div style="background:#0a0a0a;border-radius:10px;padding:24px;margin-bottom:24px">
          <div style="margin-bottom:16px">
            <div style="font-size:11px;color:#5a5550;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">Endereço do portal</div>
            <a href="${APP_URL}" style="font-size:15px;color:#c8a97a;text-decoration:none;font-weight:500">${APP_URL}</a>
          </div>
          <div>
            <div style="font-size:11px;color:#5a5550;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">Seu login</div>
            <div style="font-size:14px;color:#f0ece4">${nome} · <em style="color:#9a9590">seu e-mail cadastrado</em></div>
          </div>
        </div>

        <a href="${APP_URL}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:14px;border-radius:8px;text-align:center;font-weight:600;font-size:14px;margin-bottom:20px">
          Acessar o Portal →
        </a>

        <p style="font-size:13px;color:#888;line-height:1.6">
          Salve este email ou adicione o link aos favoritos do seu celular para acessar facilmente sempre que precisar.
        </p>
      </div>
      <div style="background:#0a0a0a;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center">
        <p style="font-size:11px;color:#5a5550;margin:0">© Claudio Alecrim · <a href="https://claudioalecrim.com.br" style="color:#5a5550">claudioalecrim.com.br</a></p>
      </div>
    </div>
    `
  }
}

export function emailPagamentoNegado(nome, aviso) {
  return {
    subject: 'Atenção: problema com seu pagamento',
    html: `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:0;background:#f5f5f5">
      <div style="background:#0a0a0a;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-family:Georgia,serif;font-size:26px;color:#c8a97a;font-weight:500">Claudio Alecrim</div>
      </div>
      <div style="background:#ffffff;padding:36px 40px">
        <p style="font-size:16px;color:#111;margin-bottom:16px">Olá, <strong>${nome}</strong>.</p>
        <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="font-size:14px;color:#c45a5a;margin:0;line-height:1.6">${aviso}</p>
        </div>
        <p style="font-size:13px;color:#555;margin-bottom:20px;line-height:1.7">
          Para regularizar, acesse o portal e atualize sua forma de pagamento, ou entre em contato diretamente comigo.
        </p>
        <a href="${APP_URL}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:14px;border-radius:8px;text-align:center;font-weight:600;font-size:14px">
          Acessar o Portal →
        </a>
      </div>
      <div style="background:#0a0a0a;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center">
        <p style="font-size:11px;color:#5a5550;margin:0">© Claudio Alecrim · <a href="https://claudioalecrim.com.br" style="color:#5a5550">claudioalecrim.com.br</a></p>
      </div>
    </div>
    `
  }
}

export function emailRenovacao(nome, mentoria) {
  return {
    subject: `Nova mentoria adicionada: ${mentoria}`,
    html: `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:0;background:#f5f5f5">
      <div style="background:#0a0a0a;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-family:Georgia,serif;font-size:26px;color:#c8a97a;font-weight:500">Claudio Alecrim</div>
      </div>
      <div style="background:#ffffff;padding:36px 40px">
        <p style="font-size:16px;color:#111;margin-bottom:16px">Olá, <strong>${nome}</strong>!</p>
        <p style="font-size:14px;color:#555;margin-bottom:24px;line-height:1.7">
          A mentoria <strong style="color:#c8a97a">${mentoria}</strong> foi adicionada ao seu portal. 
          Acesse com seu login e senha habituais — está tudo lá esperando por você.
        </p>
        <a href="${APP_URL}" style="display:block;background:#c8a97a;color:#0a0a0a;text-decoration:none;padding:14px;border-radius:8px;text-align:center;font-weight:600;font-size:14px;margin-bottom:16px">
          Acessar o Portal →
        </a>
        <div style="background:#fafafa;border-radius:8px;padding:14px 18px;text-align:center">
          <div style="font-size:12px;color:#888;margin-bottom:4px">Endereço do portal (guarde nos favoritos)</div>
          <a href="${APP_URL}" style="font-size:14px;color:#c8a97a;text-decoration:none;font-weight:500">${APP_URL}</a>
        </div>
      </div>
      <div style="background:#0a0a0a;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center">
        <p style="font-size:11px;color:#5a5550;margin:0">© Claudio Alecrim · <a href="https://claudioalecrim.com.br" style="color:#5a5550">claudioalecrim.com.br</a></p>
      </div>
    </div>
    `
  }
}
