// Twilio SMS utilities for sending alert notifications

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

interface SendSmsOptions {
  to: string;
  message: string;
}

export async function sendSms(options: SendSmsOptions): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('Twilio not configured, skipping SMS send');
    return false;
  }

  // Validate phone number format (basic check)
  const cleanPhone = options.to.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    console.warn('Invalid phone number:', options.to);
    return false;
  }

  // Format to E.164 if needed
  const formattedPhone = cleanPhone.startsWith('1')
    ? `+${cleanPhone}`
    : `+1${cleanPhone}`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: TWILIO_PHONE_NUMBER,
          Body: options.message.slice(0, 1600), // SMS limit
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Twilio send failed:', error);
      return false;
    }

    const result = await response.json();
    console.log('SMS sent:', result.sid);
    return true;
  } catch (error) {
    console.error('Twilio send error:', error);
    return false;
  }
}

// Format alert as SMS message
export function formatAlertSms(alert: {
  type: string;
  title: string;
  competitorName: string;
  promoCode?: string | null;
  discountPercent?: number | null;
}): string {
  const emoji = alert.type === 'new_promo' ? '🚨' :
                alert.type === 'promo_ended' ? '⏹️' :
                alert.type === 'email_spike' ? '📧' : '📢';

  let message = `${emoji} ${alert.title}`;

  if (alert.discountPercent) {
    message += ` - ${alert.discountPercent}% off`;
  }

  if (alert.promoCode) {
    message += ` - Code: ${alert.promoCode}`;
  }

  // Add footer
  message += '\n\n— CompetitorEdge';

  return message;
}

// Validate phone number format
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// Format phone for display
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}
