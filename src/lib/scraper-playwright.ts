import { chromium, Browser, Page } from 'playwright';

interface PlaywrightScrapeResult {
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

const PROMO_PATTERNS = [
  /(\d+)\s*%\s*(off|OFF)/i,
  /(save|SAVE)\s*(\d+)\s*%/i,
  /up\s*to\s*(\d+)\s*%/i,
  /(free|FREE)\s*(shipping|SHIPPING)/i,
  /(sale|SALE|clearance|CLEARANCE)/i,
  /\$(\d+)\s*(off|OFF)/i,
  /(sitewide|site-wide)/i,
  /(limited\s*time|today\s*only)/i,
];

const CODE_PATTERN = /(?:code|promo|coupon|use)[:\s]*([A-Z0-9]{3,20})/gi;

const ANNOUNCEMENT_SELECTORS = [
  '[class*="announcement"]',
  '[class*="promo-bar"]',
  '[class*="top-bar"]',
  '[class*="header-banner"]',
  '[class*="site-banner"]',
  '#shopify-section-announcement-bar',
];

const BANNER_SELECTORS = [
  '[class*="hero"]',
  '[class*="banner"]',
  '[class*="slider"]',
  'main section:first-child',
];

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browser;
}

function matchesPromo(text: string): boolean {
  return PROMO_PATTERNS.some((pattern) => pattern.test(text));
}

function extractDiscount(text: string): { percent: number | null; amount: number | null } {
  const percentMatch = text.match(/(\d+)\s*%/);
  if (percentMatch) {
    return { percent: parseInt(percentMatch[1]), amount: null };
  }
  const dollarMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (dollarMatch) {
    return { percent: null, amount: parseFloat(dollarMatch[1]) };
  }
  return { percent: null, amount: null };
}

function extractCode(text: string): string | null {
  const match = text.match(CODE_PATTERN);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  return null;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function scorePromo(text: string, sourceType: string): number {
  let score = 0;
  if (sourceType === 'announcement_bar') score += 30;
  if (sourceType === 'hero_banner') score += 20;
  if (/\d+\s*%/.test(text)) score += 25;
  if (/(code|promo|coupon)/i.test(text)) score += 20;
  if (/(sitewide|site-wide)/i.test(text)) score += 15;
  if (text.length > 200) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function isJunkText(text: string): boolean {
  if (text.length < 10 || text.length > 500) return true;
  if (/^(shop|men|women|sale|new|home|cart|menu)/i.test(text)) return true;
  if (/(cookie|privacy|gdpr)/i.test(text.toLowerCase())) return true;
  return false;
}

export async function scrapeWithPlaywright(url: string): Promise<PlaywrightScrapeResult> {
  const scrapedAt = new Date().toISOString();

  try {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const browser = await getBrowser();
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for dynamic content
    await page.waitForTimeout(2000);

    // Close any popups
    try {
      const closeButtons = await page.$$('[class*="close"], [aria-label="Close"]');
      for (const btn of closeButtons.slice(0, 3)) {
        await btn.click().catch(() => {});
      }
    } catch {}

    const promos: DetectedPromo[] = [];
    const seenTexts = new Set<string>();

    // Scan announcement bars
    for (const selector of ANNOUNCEMENT_SELECTORS) {
      const elements = await page.$$(selector);
      for (const el of elements) {
        const text = cleanText((await el.textContent()) || '');
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
      }
    }

    // Scan hero/banners
    for (const selector of BANNER_SELECTORS) {
      const elements = await page.$$(selector);
      for (const el of elements) {
        const linkCount = await el.$$('a').then((links) => links.length);
        if (linkCount > 10) continue;

        const text = cleanText((await el.textContent()) || '');
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
      }
    }

    await context.close();

    return {
      success: true,
      promos: promos.sort((a, b) => b.confidence - a.confidence).slice(0, 5),
      scrapedAt,
    };
  } catch (error: any) {
    return {
      success: false,
      promos: [],
      error: error.message,
      scrapedAt,
    };
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
