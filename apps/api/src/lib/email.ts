import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendWelcomeEmail(data: {
  to: string
  name: string
  companyName: string
  tempPassword: string
  loginUrl: string
}): Promise<void> {
  if (!resend) {
    console.log('[EMAIL] Resend not configured — skipping email to', data.to)
    return
  }
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Fieldis <noreply@fieldis.com.br>',
    to: data.to,
    subject: 'Bem-vindo ao Fieldis — seu acesso está pronto',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <div style="margin-bottom: 32px;">
          <span style="background: #2563eb; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">⚡ Fieldis</span>
        </div>
        <h1 style="font-size: 22px; color: #111827; margin-bottom: 16px;">Olá ${data.name}, sua conta foi criada!</h1>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
          A empresa <strong>${data.companyName}</strong> já está configurada no Fieldis.
          Use os dados abaixo para acessar o sistema.
        </p>
        <div style="background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Email de acesso</p>
          <p style="margin: 0 0 16px; color: #111827; font-size: 15px; font-weight: 600;">${data.to}</p>
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Senha temporária</p>
          <p style="margin: 0; color: #111827; font-size: 15px; font-family: monospace; font-weight: 600;">${data.tempPassword}</p>
        </div>
        <a href="${data.loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Acessar o Fieldis
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          Recomendamos trocar sua senha no primeiro acesso em Configurações &gt; Segurança.
        </p>
        <hr style="border: none; border-top: 1px solid #e3e6ed; margin: 32px 0 16px;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          &copy; 2026 Fieldis | contato@fieldis.com.br
        </p>
      </div>
    `,
  })
}
