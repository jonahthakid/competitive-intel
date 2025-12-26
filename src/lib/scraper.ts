import * as cheerio from 'cheerio';
import axios from 'axios';

// Promo detection patterns
const PROMO_PATTERNS = [
  /(\d+)\s*%\s*(off|OFF|discount)/i,
  /(save|SAVE)\s*(\d+)\s*%/i,
  /up\s*to\s*(\d+)\s*%/i,
  /(free|FREE)\s*(shipping|SHIPPING)/i,
  /(sale|SALE|clearance|CLEARANCE)/i,
  /(bogo|BOGO|buy\s*one|buy\s*1)/i,
  /\$(\d+)\s*(off|OFF)/i,
  /(sitewide|site-wide|site\s*wide)/i,
  /(limited\s*time|today\s*only|ends\s*soon)/i,
  /(extra|additional)\s*(\d+)\s*%/i,
  /(first\s*(order|purchase))/i,
  /(welcome\s*(offer|discount|code))/i,
  /(exclusive|special)\s*(offer|deal|discount)/i,
  /get\s*\$?\d+\s*(off|%)/i,
  /(unlock|claim|grab)\s*(\d+|your)\s*%/i,
];

// Email signup offer patterns
const SIGNUP_OFFER_PATTERNS = [
  /(sign\s*up|subscribe|join|enter).{0,30}(\d+\s*%|free|\$\d+)/i,
  /(\d+\s*%|free|\$\d+).{0,30}(sign\s*up|subscribe|join|first)/i,
  /(email|newsletter).{0,30}(\d+\s*%|\$\d+|discount|off)/i,
  /(get|receive|unlock).{0,20}(\d+\s*%).{0,20}(email|sign|join|subscribe)/i,
  /join.{0,30}(list|club|vip|newsletter)/i,
];

// Code extraction pattern
const CODE_PATTERN = /(?:code|promo|coupon|use)[:\s]*([A-Z0-9]{3,20})/gi;
const STANDALONE_CODE = /\b([A-Z]{2,}[0-9]{1,}|[A-Z0-9]{5,15})\b/g;

// Announcement bar selectors (prioritized)
const ANNOUNCEMENT_SELECTORS = [
  '[class*="announcement"]',
  '[class*="promo-bar"]',
  '[class*="promo_bar"]',
  '[class*="promobar"]',
  '[class*="top-bar"]',
  '[class*="topbar"]',
  '[class*="header-banner"]',
  '[class*="site-banner"]',
  '[class*="marquee"]',
  '[class*="ticker"]',
  '[id*="announcement"]',
  '[id*="promo"]',
  '[data-section-type="announcement"]',
  '.announcement-bar',
  '.promo-banner',
  '#shopify-section-announcement-bar',
];

// Hero/banner selectors
const BANNER_SELECTORS = [
  '[class*="hero"]',
  '[class*="banner"]',
  '[class*="slider"]',
  '[class*="carousel"]',
  '[class*="homepage-hero"]',
  '[class*="main-banner"]',
  '[class*="feature"]',
  'main section:first-child',
];

// Popup/modal selectors (email signup offers)
const POPUP_SELECTORS = [
  '[class*="popup"]',
  '[class*="modal"]',
  '[class*="newsletter"]',
  '[class*="signup"]',
  '[class*="sign-up"]',
  '[class*="subscribe"]',
  '[class*="email-capture"]',
  '[class*="email-signup"]',
  '[class*="klaviyo"]',
  '[class*="privy"]',
  '[class*="optinmonster"]',
  '[class*="sumo"]',
  '[class*="wheelio"]',
  '[class*="spin-wheel"]',
  '[class*="exit-intent"]',
  '[class*="welcome-popup"]',
  '[class*="first-visit"]',
  '[id*="popup"]',
  '[id*="modal"]',
  '[id*="newsletter"]',
  '[data-popup]',
  '[data-modal]',
  '[role="dialog"]',
  '.klaviyo-form',
  '.privy-popup',
];

interface ScrapeResult {
  success: boolean;
  promos: DetectedPromo[];
  error?: string;
  scrapedAt: string;
}

interface DetectedPromo {
  text: string;
  discountPercent: number | null;
  discountAmount: number | null;
  code: string | null;
  sourceType: 'announcement_bar' | 'hero_banner' | 'popup' | 'other';
  confidence: number;
}

function matchesPromo(text: string): boolean {
  return PROMO_PATTERNS.some(pattern => pattern.test(text));
}

function matchesSignupOffer(text: string): boolean {
  return SIGNUP_OFFER_PATTERNS.some(pattern => pattern.test(text));
}

function extractDiscount(text: string): { percent: number | null; amount: number | null } {
  // Try percentage first
  const percentMatch = text.match(/(\d+)\s*%/);
  if (percentMatch) {
    return { percent: parseInt(percentMatch[1]), amount: null };
  }
  
  // Try dollar amount
  const dollarMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (dollarMatch) {
    return { percent: null, amount: parseFloat(dollarMatch[1]) };
  }
  
  return { percent: null, amount: null };
}

function extractCode(text: string): string | null {
  // Try explicit code patterns first
  const explicitMatch = text.match(CODE_PATTERN);
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1].toUpperCase();
  }
  
  // Look for standalone codes (all caps + numbers)
  const standaloneMatches = text.match(STANDALONE_CODE);
  if (standaloneMatches) {
    // Filter out common false positives
    const filtered = standaloneMatches.filter(code => {
      const upper = code.toUpperCase();
      const blacklist = ['FREE', 'SALE', 'SAVE', 'OFF', 'SHOP', 'NOW', 'NEW', 'BEST', 'TOP', 'HOT', 'BUY', 'GET'];
      return !blacklist.includes(upper) && code.length >= 4 && code.length <= 15;
    });
    if (filtered.length > 0) {
      return filtered[0].toUpperCase();
    }
  }
  
  return null;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\n\r\t]/g, ' ')
    .trim()
    .slice(0, 500);
}

function scorePromo(text: string, sourceType: string): number {
  let score = 0;

  // Source type scoring
  if (sourceType === 'announcement_bar') score += 30;
  if (sourceType === 'hero_banner') score += 20;
  if (sourceType === 'popup') score += 25;

  // Content scoring
  if (/\d+\s*%/.test(text)) score += 25;
  if (/(code|promo|coupon)/i.test(text)) score += 20;
  if (/(sitewide|site-wide)/i.test(text)) score += 15;
  if (/(free shipping)/i.test(text)) score += 10;
  if (/(sale|clearance)/i.test(text)) score += 10;
  if (/(limited|today|ends)/i.test(text)) score += 5;

  // Signup offer bonuses
  if (/(sign\s*up|subscribe|join|newsletter)/i.test(text)) score += 15;
  if (/(first\s*(order|purchase)|welcome)/i.test(text)) score += 15;
  if (/(email|inbox)/i.test(text)) score += 10;

  // Penalize long text (likely not a promo)
  if (text.length > 200) score -= 10;
  if (text.length > 300) score -= 20;

  return Math.max(0, Math.min(100, score));
}

// Extract offers from JSON-LD schema
function extractOffersFromSchema(json: any): DetectedPromo[] {
  const offers: DetectedPromo[] = [];

  function traverse(obj: any) {
    if (!obj || typeof obj !== 'object') return;

    // Check for Offer type
    if (obj['@type'] === 'Offer' || obj['@type'] === 'AggregateOffer') {
      const discount = obj.discount || obj.priceDiscount;
      const description = obj.description || obj.name || '';

      if (discount || (description && matchesPromo(description))) {
        const { percent, amount } = extractDiscount(String(discount || description));
        offers.push({
          text: description || `${discount} off`,
          discountPercent: percent,
          discountAmount: amount,
          code: obj.discountCode || null,
          sourceType: 'other',
          confidence: 50,
        });
      }
    }

    // Check for Sale type
    if (obj['@type'] === 'Sale' || obj['@type'] === 'OfferCatalog') {
      const name = obj.name || obj.description || '';
      if (name && matchesPromo(name)) {
        const { percent, amount } = extractDiscount(name);
        offers.push({
          text: name,
          discountPercent: percent,
          discountAmount: amount,
          code: null,
          sourceType: 'other',
          confidence: 45,
        });
      }
    }

    // Recurse into arrays and objects
    if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else {
      Object.values(obj).forEach(traverse);
    }
  }

  traverse(json);
  return offers;
}

function isJunkText(text: string): boolean {
  const lower = text.toLowerCase();
  
  // Too short or too long
  if (text.length < 10 || text.length > 500) return true;
  
  // Navigation/menu text
  if (/^(shop|men|women|sale|new|home|cart|account|search|menu)/i.test(text)) return true;
  
  // Just a list of nav items
  if ((text.match(/\s{2,}/g) || []).length > 5) return true;
  
  // Cookie/privacy notices
  if (/(cookie|privacy|gdpr|consent)/i.test(lower)) return true;
  
  return false;
}

export async function scrapeHomepage(url: string): Promise<ScrapeResult> {
  const scrapedAt = new Date().toISOString();
  
  try {
    // Normalize URL
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 5,
    });
    
    const $ = cheerio.load(response.data);
    const promos: DetectedPromo[] = [];
    const seenTexts = new Set<string>();
    
    // Remove script and style elements
    $('script, style, noscript, iframe').remove();
    
    // Scan announcement bars first (highest priority)
    for (const selector of ANNOUNCEMENT_SELECTORS) {
      $(selector).each((_, el) => {
        const text = cleanText($(el).text());
        
        if (text && !seenTexts.has(text) && matchesPromo(text) && !isJunkText(text)) {
          seenTexts.add(text);
          const { percent, amount } = extractDiscount(text);
          const code = extractCode(text);
          const confidence = scorePromo(text, 'announcement_bar');
          
          if (confidence >= 30) {
            promos.push({
              text,
              discountPercent: percent,
              discountAmount: amount,
              code,
              sourceType: 'announcement_bar',
              confidence,
            });
          }
        }
      });
    }
    
    // Scan hero/banner sections
    for (const selector of BANNER_SELECTORS) {
      $(selector).each((_, el) => {
        // Skip if it contains too many links (likely navigation)
        if ($(el).find('a').length > 10) return;

        const text = cleanText($(el).text());

        if (text && !seenTexts.has(text) && matchesPromo(text) && !isJunkText(text)) {
          seenTexts.add(text);
          const { percent, amount } = extractDiscount(text);
          const code = extractCode(text);
          const confidence = scorePromo(text, 'hero_banner');

          if (confidence >= 30) {
            promos.push({
              text,
              discountPercent: percent,
              discountAmount: amount,
              code,
              sourceType: 'hero_banner',
              confidence,
            });
          }
        }
      });
    }

    // Scan popups/modals for email signup offers
    for (const selector of POPUP_SELECTORS) {
      $(selector).each((_, el) => {
        const text = cleanText($(el).text());

        // Check for both promo patterns and signup offer patterns
        if (text && !seenTexts.has(text) && (matchesPromo(text) || matchesSignupOffer(text)) && !isJunkText(text)) {
          seenTexts.add(text);
          const { percent, amount } = extractDiscount(text);
          const code = extractCode(text);
          const confidence = scorePromo(text, 'popup');

          if (confidence >= 25) {
            promos.push({
              text,
              discountPercent: percent,
              discountAmount: amount,
              code,
              sourceType: 'popup',
              confidence,
            });
          }
        }
      });
    }

    // Also scan for forms with email inputs that have promo text nearby
    $('form').each((_, form) => {
      const hasEmailInput = $(form).find('input[type="email"], input[name*="email"], input[placeholder*="email"]').length > 0;
      if (hasEmailInput) {
        const formText = cleanText($(form).text());
        if (formText && !seenTexts.has(formText) && matchesSignupOffer(formText) && !isJunkText(formText)) {
          seenTexts.add(formText);
          const { percent, amount } = extractDiscount(formText);
          const code = extractCode(formText);
          const confidence = scorePromo(formText, 'popup');

          if (confidence >= 25) {
            promos.push({
              text: formText,
              discountPercent: percent,
              discountAmount: amount,
              code,
              sourceType: 'popup',
              confidence,
            });
          }
        }
      }
    });

    // Parse JSON-LD structured data for offers
    $('script[type="application/ld+json"]').each((_, script) => {
      try {
        const json = JSON.parse($(script).html() || '');
        const offers = extractOffersFromSchema(json);
        for (const offer of offers) {
          if (!seenTexts.has(offer.text)) {
            seenTexts.add(offer.text);
            promos.push(offer);
          }
        }
      } catch {
        // Ignore invalid JSON
      }
    });

    // Sort by confidence and dedupe
    const sortedPromos = promos
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8); // Max 8 promos per scrape
    
    return {
      success: true,
      promos: sortedPromos,
      scrapedAt,
    };
    
  } catch (error: any) {
    return {
      success: false,
      promos: [],
      error: error.message || 'Unknown error',
      scrapedAt,
    };
  }
}

// Utility to extract domain from URL
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

// Utility to normalize URL
export function normalizeUrl(url: string): string {
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return url;
  }
}
