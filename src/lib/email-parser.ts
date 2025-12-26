// Email parsing utilities for extracting promo information from competitor emails

export interface ParsedEmail {
  subject: string;
  fromAddress: string;
  fromDomain: string;
  bodyText: string;
  bodyHtml: string;
  campaignType: 'promo' | 'new_arrival' | 'newsletter' | 'abandoned_cart' | 'transactional' | 'other';
  promoCode: string | null;
  discountPercent: number | null;
  confidence: number;
}

// Campaign type detection patterns
const CAMPAIGN_PATTERNS = {
  promo: [
    /\d+%\s*(off|OFF)/i,
    /(sale|SALE|clearance)/i,
    /(save|SAVE)\s*\$?\d+/i,
    /(free shipping|FREE SHIPPING)/i,
    /(bogo|buy\s*one|buy\s*1)/i,
    /(limited time|flash sale|today only)/i,
    /(discount|coupon|promo)/i,
  ],
  new_arrival: [
    /(new arrival|just dropped|now available)/i,
    /(just landed|fresh drop|new collection)/i,
    /(introducing|meet the|discover)/i,
  ],
  newsletter: [
    /(weekly|monthly|digest)/i,
    /(newsletter|update|news)/i,
    /(roundup|recap|highlights)/i,
  ],
  abandoned_cart: [
    /(forgot something|left behind|still interested)/i,
    /(cart|checkout|complete your order)/i,
    /(waiting for you|come back)/i,
  ],
  transactional: [
    /(order confirm|shipping confirm|delivered)/i,
    /(receipt|invoice|payment)/i,
    /(tracking|shipped|on its way)/i,
    /(password reset|account|verify)/i,
  ],
};

// Promo code extraction patterns
const CODE_PATTERNS = [
  /(?:code|promo|coupon|use)[:\s]+([A-Z0-9]{3,20})/gi,
  /(?:enter|apply)[:\s]+([A-Z0-9]{3,20})/gi,
  /\b([A-Z]{2,}[0-9]{2,}|[0-9]{2,}[A-Z]{2,})\b/g, // SAVE20, 20OFF, etc.
];

// Blacklist for false positive codes
const CODE_BLACKLIST = new Set([
  'FREE', 'SALE', 'SAVE', 'SHOP', 'BUY', 'GET', 'NEW', 'OFF',
  'NOW', 'TODAY', 'BEST', 'TOP', 'HOT', 'CLICK', 'HERE',
  'VIEW', 'MORE', 'LESS', 'ALL', 'THE', 'AND', 'FOR',
  'HTTPS', 'HTTP', 'WWW', 'COM', 'ORG', 'NET',
]);

export function extractDomain(email: string): string {
  const match = email.match(/@([^>]+)/);
  if (match) {
    return match[1].toLowerCase().replace(/^.*@/, '');
  }
  return '';
}

export function classifyCampaignType(
  subject: string,
  bodyText: string
): 'promo' | 'new_arrival' | 'newsletter' | 'abandoned_cart' | 'transactional' | 'other' {
  const text = `${subject} ${bodyText}`.toLowerCase();

  // Check each campaign type in priority order
  for (const [type, patterns] of Object.entries(CAMPAIGN_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return type as keyof typeof CAMPAIGN_PATTERNS;
      }
    }
  }

  return 'other';
}

export function extractPromoCode(text: string): string | null {
  for (const pattern of CODE_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const code = match[1]?.toUpperCase();
      if (code && code.length >= 4 && code.length <= 20 && !CODE_BLACKLIST.has(code)) {
        return code;
      }
    }
  }
  return null;
}

export function extractDiscountPercent(text: string): number | null {
  // Look for percentage patterns
  const patterns = [
    /(\d{1,2})\s*%\s*off/i,
    /save\s*(\d{1,2})\s*%/i,
    /(\d{1,2})\s*%\s*discount/i,
    /up\s*to\s*(\d{1,2})\s*%/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const percent = parseInt(match[1], 10);
      if (percent > 0 && percent <= 100) {
        return percent;
      }
    }
  }

  return null;
}

export function calculateConfidence(
  subject: string,
  campaignType: string,
  hasPromoCode: boolean,
  hasDiscount: boolean
): number {
  let confidence = 50; // Base confidence

  // Boost for promo campaign type
  if (campaignType === 'promo') {
    confidence += 20;
  }

  // Boost for having a promo code
  if (hasPromoCode) {
    confidence += 15;
  }

  // Boost for having a discount
  if (hasDiscount) {
    confidence += 10;
  }

  // Boost for strong promo keywords in subject
  if (/\d+%|sale|discount|save/i.test(subject)) {
    confidence += 10;
  }

  return Math.min(100, confidence);
}

export function parseEmail(
  subject: string,
  fromAddress: string,
  bodyText: string,
  bodyHtml: string
): ParsedEmail {
  const fromDomain = extractDomain(fromAddress);
  const fullText = `${subject} ${bodyText}`;

  const campaignType = classifyCampaignType(subject, bodyText);
  const promoCode = extractPromoCode(fullText);
  const discountPercent = extractDiscountPercent(fullText);
  const confidence = calculateConfidence(
    subject,
    campaignType,
    !!promoCode,
    discountPercent !== null
  );

  return {
    subject,
    fromAddress,
    fromDomain,
    bodyText,
    bodyHtml,
    campaignType,
    promoCode,
    discountPercent,
    confidence,
  };
}

// Match email sender to a competitor by domain
export async function matchSenderToCompetitor(
  fromAddress: string,
  orgId: string,
  supabaseAdmin: any
): Promise<string | null> {
  const fromDomain = extractDomain(fromAddress);
  if (!fromDomain) return null;

  // Try exact domain match first
  const { data: exactMatch } = await supabaseAdmin
    .from('competitors')
    .select('id')
    .eq('org_id', orgId)
    .eq('domain', fromDomain)
    .single();

  if (exactMatch) {
    return exactMatch.id;
  }

  // Try matching with common email domain variations
  // e.g., email.nike.com -> nike.com
  const baseDomain = fromDomain.replace(/^(email|mail|news|marketing|promo)\./, '');

  const { data: fuzzyMatch } = await supabaseAdmin
    .from('competitors')
    .select('id, domain')
    .eq('org_id', orgId);

  if (fuzzyMatch) {
    for (const competitor of fuzzyMatch) {
      if (baseDomain.includes(competitor.domain) || competitor.domain.includes(baseDomain)) {
        return competitor.id;
      }
    }
  }

  return null;
}
