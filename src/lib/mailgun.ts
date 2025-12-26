// Mailgun utilities for sending transactional emails

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM = process.env.MAILGUN_FROM || `noreply@${MAILGUN_DOMAIN}`;

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.warn('Mailgun not configured, skipping email send');
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('from', MAILGUN_FROM);
    formData.append('to', options.to);
    formData.append('subject', options.subject);
    if (options.text) formData.append('text', options.text);
    if (options.html) formData.append('html', options.html);

    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Mailgun send failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Mailgun send error:', error);
    return false;
  }
}

// Send alert digest email
export async function sendAlertDigest(
  to: string,
  alerts: Array<{
    type: string;
    title: string;
    message: string;
    competitorName: string;
    createdAt: string;
  }>
): Promise<boolean> {
  if (alerts.length === 0) return true;

  const alertsHtml = alerts
    .map(
      (alert) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${alert.competitorName}</strong>
        <br>
        <span style="color: #666;">${alert.title}</span>
        <br>
        <small style="color: #999;">${new Date(alert.createdAt).toLocaleString()}</small>
      </td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; }
        table { width: 100%; background: white; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>CompetitorEdge Alert Digest</h1>
        </div>
        <div class="content">
          <p>You have ${alerts.length} new alert${alerts.length > 1 ? 's' : ''} from your competitors:</p>
          <table>
            ${alertsHtml}
          </table>
          <p style="margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/alerts"
               style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
              View All Alerts
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `CompetitorEdge Alert Digest\n\nYou have ${alerts.length} new alerts:\n\n${alerts
    .map((a) => `- ${a.competitorName}: ${a.title}`)
    .join('\n')}`;

  return sendEmail({
    to,
    subject: `[CompetitorEdge] ${alerts.length} new competitive alert${alerts.length > 1 ? 's' : ''}`,
    html,
    text,
  });
}

// Verify Mailgun webhook signature
export function verifyWebhookSignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    console.warn('MAILGUN_WEBHOOK_SIGNING_KEY not set, skipping verification');
    return true; // Allow in development
  }

  const crypto = require('crypto');
  const encodedToken = crypto
    .createHmac('sha256', signingKey)
    .update(timestamp + token)
    .digest('hex');

  return encodedToken === signature;
}
