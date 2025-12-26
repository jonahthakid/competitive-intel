import * as cheerio from 'cheerio';
import axios from 'axios';

// Promo detection patterns
const PROMO_PATTERNS = [
  /(\d+)\s*%\s*(off|OFF)/i,
  /(save|SAVE)\s*(\d+)\s*%/i,
  /up\s*to\s*(\d+)\s*%/i,
  /(free|FREE)\s*(shipping|SHIPPING)/i,
  /(sale|SALE|clearance|CLEARANCE)/i,
  /(bogo|BOGO|buy\s*one|buy\s*1)/i,
  /\$(\d+)\s*(off|OFF)/i,
  /(sitewide|site-wide|site\s*wide)/i,
  /(limited\s*time|today\s*only|ends\s*soon)/i,
  /(extra|additional)\s*(\d+)\s*%/i,
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
  'main section:first-child',
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
  
  // Content scoring
  if (/\d+\s*%/.test(text)) score += 25;
  if (/(code|promo|coupon)/i.test(text)) score += 20;
  if (/(sitewide|site-wide)/i.test(text)) score += 15;
  if (/(free shipping)/i.test(text)) score += 10;
  if (/(sale|clearance)/i.test(text)) score += 10;
  if (/(limited|today|ends)/i.test(text)) score += 5;
  
  // Penalize long text (likely not a promo)
  if (text.length > 200) score -= 10;
  if (text.length > 300) score -= 20;
  
  return Math.max(0, Math.min(100, score));
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
    
    // Sort by confidence and dedupe
    const sortedPromos = promos
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Max 5 promos per scrape
    
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
