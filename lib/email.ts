import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const ALERT_TO = process.env.ADMIN_ALERT_EMAIL!
const ALERT_FROM = process.env.ALERT_FROM_EMAIL ?? 'security@mokidsplace.com'

export async function sendLoginAlert({
  ip,
  attempts,
  lockoutMinutes,
  round,
}: {
  ip: string
  attempts: number
  lockoutMinutes: number
  round: number
}) {
  if (!process.env.RESEND_API_KEY || !ALERT_TO) return

  const time = new Date().toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const roundLabel = round === 1 ? '1st' : round === 2 ? '2nd' : `${round}th`

  await resend.emails.send({
    from: ALERT_FROM,
    to: ALERT_TO,
    subject: `⚠️ Failed admin login attempt — MoKids Place`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #D9247A; margin-bottom: 4px;">⚠️ Failed Login Alert</h2>
        <p style="color: #666; margin-top: 0;">Someone tried to access your MoKids admin panel and got locked out.</p>

        <table style="width:100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background:#f9f9f9;">
            <td style="padding: 10px 14px; color: #666; font-weight: bold;">IP Address</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #111;">${ip}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #666; font-weight: bold;">Failed Attempts</td>
            <td style="padding: 10px 14px; color: #111;">${attempts}</td>
          </tr>
          <tr style="background:#f9f9f9;">
            <td style="padding: 10px 14px; color: #666; font-weight: bold;">Lockout Duration</td>
            <td style="padding: 10px 14px; color: #111;">${lockoutMinutes} minutes</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #666; font-weight: bold;">Lockout Round</td>
            <td style="padding: 10px 14px; color: #111;">${roundLabel} lockout — next window is stricter</td>
          </tr>
          <tr style="background:#f9f9f9;">
            <td style="padding: 10px 14px; color: #666; font-weight: bold;">Time (Lagos)</td>
            <td style="padding: 10px 14px; color: #111;">${time}</td>
          </tr>
        </table>

        <p style="font-size: 14px; color: #444;">
          If this keeps happening, you can permanently block this IP from your admin panel:
        </p>
        <a href="https://www.mokidsplace.com/admin/security"
           style="display:inline-block; padding: 10px 20px; background: #D9247A; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Open Security Panel →
        </a>

        <p style="font-size: 12px; color: #aaa; margin-top: 24px;">
          This is an automated alert from MoKids Place. If this was you testing the login, ignore this email.
        </p>
      </div>
    `,
  })
}
