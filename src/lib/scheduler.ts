import { supabaseAdmin, Competitor } from './supabase';
import { scrapeHomepage } from './scraper';
import { PLANS, PlanTier } from './stripe';

interface ScrapeJob {
  competitor: Competitor;
  orgPlanTier: PlanTier;
}

// Get competitors that need scraping based on their org's plan tier
export async function getCompetitorsDueForScrape(): Promise<ScrapeJob[]> {
  const now = new Date();
  const jobs: ScrapeJob[] = [];

  // Get all active competitors with their org's plan tier
  const { data: competitors, error } = await supabaseAdmin
    .from('competitors')
    .select(`
      *,
      organizations!inner (
        id,
        plan_tier,
        subscription_status
      )
    `)
    .eq('scrape_status', 'active')
    .order('last_scraped_at', { ascending: true, nullsFirst: true });

  if (error || !competitors) {
    console.error('Failed to fetch competitors for scraping:', error);
    return [];
  }

  for (const competitor of competitors) {
    const org = competitor.organizations as any;
    const planTier = (org.plan_tier || 'starter') as PlanTier;
    const plan = PLANS[planTier];

    // Skip if org subscription is not active (except starter which is free)
    if (planTier !== 'starter' && org.subscription_status !== 'active') {
      continue;
    }

    // Check if enough time has passed since last scrape
    const scrapeIntervalMs = plan.scrapeIntervalHours * 60 * 60 * 1000;
    const lastScraped = competitor.last_scraped_at
      ? new Date(competitor.last_scraped_at).getTime()
      : 0;

    if (now.getTime() - lastScraped >= scrapeIntervalMs) {
      jobs.push({
        competitor: competitor as Competitor,
        orgPlanTier: planTier,
      });
    }
  }

  return jobs;
}

// Process a single scrape job
export async function processScrapeJob(job: ScrapeJob): Promise<{
  success: boolean;
  promosFound: number;
  error?: string;
}> {
  const { competitor } = job;

  try {
    // Perform the scrape
    const result = await scrapeHomepage(competitor.homepage_url);

    if (!result.success) {
      // Update competitor status to error
      await supabaseAdmin
        .from('competitors')
        .update({
          scrape_status: 'error',
          last_scraped_at: new Date().toISOString(),
        })
        .eq('id', competitor.id);

      return { success: false, promosFound: 0, error: result.error };
    }

    // Update existing promos to inactive if not found
    const { data: existingPromos } = await supabaseAdmin
      .from('promos')
      .select('id, promo_text')
      .eq('competitor_id', competitor.id)
      .eq('is_active', true);

    const newPromoTexts = new Set(result.promos.map((p) => p.text));
    const promosToDeactivate = (existingPromos || [])
      .filter((p) => !newPromoTexts.has(p.promo_text))
      .map((p) => p.id);

    if (promosToDeactivate.length > 0) {
      await supabaseAdmin
        .from('promos')
        .update({ is_active: false })
        .in('id', promosToDeactivate);
    }

    // Upsert new promos
    for (const promo of result.promos) {
      const existingPromo = (existingPromos || []).find(
        (p) => p.promo_text === promo.text
      );

      if (existingPromo) {
        // Update last_seen_at
        await supabaseAdmin
          .from('promos')
          .update({
            last_seen_at: new Date().toISOString(),
            is_active: true,
          })
          .eq('id', existingPromo.id);
      } else {
        // Insert new promo
        await supabaseAdmin.from('promos').insert({
          competitor_id: competitor.id,
          promo_text: promo.text,
          discount_percent: promo.discountPercent,
          discount_amount: promo.discountAmount,
          promo_code: promo.code,
          source_type: promo.sourceType,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          is_active: true,
        });
      }
    }

    // Update competitor status
    await supabaseAdmin
      .from('competitors')
      .update({
        scrape_status: 'active',
        last_scraped_at: new Date().toISOString(),
      })
      .eq('id', competitor.id);

    return { success: true, promosFound: result.promos.length };
  } catch (error: any) {
    console.error(`Scrape failed for ${competitor.domain}:`, error);

    await supabaseAdmin
      .from('competitors')
      .update({
        scrape_status: 'error',
        last_scraped_at: new Date().toISOString(),
      })
      .eq('id', competitor.id);

    return { success: false, promosFound: 0, error: error.message };
  }
}

// Run all pending scrape jobs (with concurrency limit)
export async function runScheduledScrapes(maxConcurrent: number = 5): Promise<{
  total: number;
  successful: number;
  failed: number;
}> {
  const jobs = await getCompetitorsDueForScrape();
  console.log(`Found ${jobs.length} competitors due for scraping`);

  let successful = 0;
  let failed = 0;

  // Process jobs in batches
  for (let i = 0; i < jobs.length; i += maxConcurrent) {
    const batch = jobs.slice(i, i + maxConcurrent);
    const results = await Promise.all(batch.map(processScrapeJob));

    for (const result of results) {
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + maxConcurrent < jobs.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { total: jobs.length, successful, failed };
}
