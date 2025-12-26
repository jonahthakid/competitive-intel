// Slack webhook utilities for sending alert notifications

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: { type: string; text: string };
    url?: string;
    style?: string;
  }>;
}

export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> {
  if (!webhookUrl) {
    console.warn('No Slack webhook URL provided');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('Slack webhook failed:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Slack webhook error:', error);
    return false;
  }
}

// Format an alert as a Slack message
export function formatAlertMessage(alert: {
  type: string;
  title: string;
  message: string;
  competitorName: string;
  competitorDomain: string;
  promoCode?: string;
  discountPercent?: number;
}): SlackMessage {
  const emoji = getAlertEmoji(alert.type);
  const color = getAlertColor(alert.type);

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${alert.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${alert.competitorName}* (${alert.competitorDomain})\n${alert.message}`,
      },
    },
  ];

  // Add promo details if available
  if (alert.promoCode || alert.discountPercent) {
    const details: string[] = [];
    if (alert.discountPercent) details.push(`*${alert.discountPercent}% off*`);
    if (alert.promoCode) details.push(`Code: \`${alert.promoCode}\``);

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: details.join(' | '),
      },
    });
  }

  // Add action button
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View in Dashboard',
        },
        url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        style: 'primary',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Visit Competitor',
        },
        url: `https://${alert.competitorDomain}`,
      },
    ],
  });

  return {
    text: `${emoji} ${alert.title} - ${alert.competitorName}`,
    blocks,
  };
}

function getAlertEmoji(type: string): string {
  switch (type) {
    case 'new_promo':
      return '🏷️';
    case 'promo_ended':
      return '🔔';
    case 'email_spike':
      return '📧';
    case 'price_drop':
      return '💰';
    case 'new_competitor':
      return '👀';
    default:
      return '📊';
  }
}

function getAlertColor(type: string): string {
  switch (type) {
    case 'new_promo':
      return '#10b981'; // green
    case 'promo_ended':
      return '#f59e0b'; // amber
    case 'email_spike':
      return '#3b82f6'; // blue
    case 'price_drop':
      return '#8b5cf6'; // purple
    default:
      return '#6b7280'; // gray
  }
}

// Send multiple alerts as a digest
export async function sendSlackDigest(
  webhookUrl: string,
  alerts: Array<{
    type: string;
    title: string;
    competitorName: string;
  }>
): Promise<boolean> {
  if (alerts.length === 0) return true;

  const alertList = alerts
    .map((a) => `• ${getAlertEmoji(a.type)} *${a.competitorName}*: ${a.title}`)
    .join('\n');

  const message: SlackMessage = {
    text: `You have ${alerts.length} new competitive alerts`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 CompetitorEdge Digest: ${alerts.length} New Alerts`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: alertList,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View All Alerts',
            },
            url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/alerts`,
            style: 'primary',
          },
        ],
      },
    ],
  };

  return sendSlackMessage(webhookUrl, message);
}
