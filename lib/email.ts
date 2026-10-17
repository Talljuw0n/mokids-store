import { Resend } from 'resend'

// Created on first use — constructing it at import time throws when
// RESEND_API_KEY is unset, which would take down every route importing this file
let _resend: Resend | null = null
function resend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// Comma-separated list, e.g. "owner@example.com,shop@example.com"
const ALERT_TO = (process.env.ADMIN_ALERT_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)
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
  if (!process.env.RESEND_API_KEY || ALERT_TO.length === 0) return

  const time = new Date().toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const roundLabel = round === 1 ? '1st' : round === 2 ? '2nd' : `${round}th`

  await resend().emails.send({
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

// Alerts the shop owner about a paid order that needs a human to look at it —
// e.g. a payment amount that doesn't match the order, or stock that ran out
// between checkout and payment. Customer-supplied text is HTML-escaped.
export async function sendOrderAlert({
  subject,
  orderId,
  lines,
}: {
  subject: string
  orderId: string
  lines: string[]
}) {
  if (!process.env.RESEND_API_KEY || ALERT_TO.length === 0) return

  await resend().emails.send({
    from: ALERT_FROM,
    to: ALERT_TO,
    subject: `⚠️ ${subject} — MoKids Place`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #D9247A; margin-bottom: 4px;">⚠️ ${escapeHtml(subject)}</h2>
        <p style="color: #666; margin-top: 0;">Order <strong>${escapeHtml(orderId.slice(0, 8).toUpperCase())}</strong> (${escapeHtml(orderId)})</p>
        <ul style="font-size: 14px; color: #111; line-height: 1.6;">
          ${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}
        </ul>
        <a href="https://www.mokidsplace.com/admin/orders"
           style="display:inline-block; padding: 10px 20px; background: #D9247A; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Open Orders →
        </a>
      </div>
    `,
  })
}

type NewOrderEmailOrder = {
  id: string
  customer_name: string
  email: string
  phone: string
  shipping_address: string
  state: string
  items: { name: string; size: string; quantity: number; price: number }[]
  subtotal: number
  shipping_fee: number
  total: number
}

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

// Sent to the shop when an order is paid — everything needed to pack and
// ship it without opening the admin panel
export async function sendNewOrderEmail(order: NewOrderEmailOrder) {
  if (!process.env.RESEND_API_KEY || ALERT_TO.length === 0) return

  const shortId = order.id.slice(0, 8).toUpperCase()
  const rows = order.items.map(i => `
    <tr>
      <td style="padding: 8px 10px; border-bottom: 1px solid #eee;">${escapeHtml(i.name)}<br><span style="color:#888; font-size:12px;">Size: ${escapeHtml(i.size)}</span></td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align:center;">${i.quantity}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align:right;">${naira(i.price * i.quantity)}</td>
    </tr>`).join('')

  await resend().emails.send({
    from: ALERT_FROM,
    to: ALERT_TO,
    subject: `🛍️ New order ${shortId} — ${naira(order.total)} — MoKids Place`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #D9247A; margin-bottom: 4px;">🛍️ New paid order</h2>
        <p style="color: #666; margin-top: 0;">Order <strong>${shortId}</strong> has been paid and is ready to pack.</p>

        <h3 style="font-size: 15px; margin-bottom: 6px;">Customer</h3>
        <p style="font-size: 14px; color: #111; margin-top: 0; line-height: 1.6;">
          ${escapeHtml(order.customer_name)}<br>
          ${escapeHtml(order.phone)} · ${escapeHtml(order.email)}<br>
          ${escapeHtml(order.shipping_address)}, ${escapeHtml(order.state)}
        </p>

        <table style="width:100%; border-collapse: collapse; font-size: 14px; margin: 12px 0;">
          <tr style="background:#f9f9f9;">
            <th style="padding: 8px 10px; text-align:left;">Item</th>
            <th style="padding: 8px 10px;">Qty</th>
            <th style="padding: 8px 10px; text-align:right;">Amount</th>
          </tr>
          ${rows}
          <tr><td colspan="2" style="padding: 6px 10px; color:#666;">Subtotal</td><td style="padding: 6px 10px; text-align:right;">${naira(order.subtotal)}</td></tr>
          <tr><td colspan="2" style="padding: 6px 10px; color:#666;">Delivery</td><td style="padding: 6px 10px; text-align:right;">${naira(order.shipping_fee)}</td></tr>
          <tr><td colspan="2" style="padding: 6px 10px; font-weight:bold;">Total paid</td><td style="padding: 6px 10px; text-align:right; font-weight:bold; color:#D9247A;">${naira(order.total)}</td></tr>
        </table>

        <a href="https://www.mokidsplace.com/admin/orders"
           style="display:inline-block; padding: 10px 20px; background: #D9247A; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Open Orders →
        </a>
      </div>
    `,
  })
}
