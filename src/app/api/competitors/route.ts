import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';
import { extractDomain, normalizeUrl, scrapeHomepage } from '@/lib/scraper';

// GET /api/competitors - List all competitors for the user
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create organization
    const org = await getOrCreateOrg(userId);
    
    // Fetch competitors
    const { data: competitors, error } = await supabaseAdmin
      .from('competitors')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ competitors });
  } catch (error: any) {
    console.error('Error fetching competitors:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch competitors' },
      { status: 500 }
    );
  }
}

// POST /api/competitors - Add a new competitor
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Get or create organization
    const org = await getOrCreateOrg(userId);

    // Check competitor limit
    const { count } = await supabaseAdmin
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id);

    if (count && count >= org.competitor_limit) {
      return NextResponse.json(
        { error: `You've reached your limit of ${org.competitor_limit} competitors. Upgrade to add more.` },
        { status: 403 }
      );
    }

    // Extract domain and normalize URL
    const domain = extractDomain(url);
    const homepageUrl = normalizeUrl(url);
    
    // Generate name from domain (capitalize first letter)
    const name = domain
      .split('.')[0]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from('competitors')
      .select('id')
      .eq('org_id', org.id)
      .eq('domain', domain)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This competitor is already being tracked' },
        { status: 400 }
      );
    }

    // Insert competitor
    const { data: competitor, error } = await supabaseAdmin
      .from('competitors')
      .insert({
        org_id: org.id,
        name,
        domain,
        homepage_url: homepageUrl,
        scrape_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger initial scrape asynchronously
    scrapeAndSave(competitor.id, homepageUrl).catch(console.error);

    return NextResponse.json({ competitor });
  } catch (error: any) {
    console.error('Error adding competitor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add competitor' },
      { status: 500 }
    );
  }
}

// Helper: Get or create organization for user
async function getOrCreateOrg(clerkUserId: string) {
  // Try to find existing org
  const { data: existing } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (existing) return existing;

  // Create new org
  const user = await currentUser();
  const { data: newOrg, error } = await supabaseAdmin
    .from('organizations')
    .insert({
      clerk_user_id: clerkUserId,
      name: user?.firstName ? `${user.firstName}'s Team` : 'My Team',
      email: user?.emailAddresses?.[0]?.emailAddress,
      plan_tier: 'starter',
      competitor_limit: 5,
    })
    .select()
    .single();

  if (error) throw error;
  return newOrg;
}

// Helper: Scrape and save promos
async function scrapeAndSave(competitorId: string, url: string) {
  try {
    const result = await scrapeHomepage(url);
    
    // Update competitor status
    await supabaseAdmin
      .from('competitors')
      .update({
        scrape_status: result.success ? 'active' : 'error',
        last_scraped_at: new Date().toISOString(),
      })
      .eq('id', competitorId);

    if (result.success && result.promos.length > 0) {
      // Get existing active promos to avoid duplicates
      const { data: existingPromos } = await supabaseAdmin
        .from('promos')
        .select('promo_text')
        .eq('competitor_id', competitorId)
        .eq('is_active', true);

      const existingTexts = new Set(existingPromos?.map(p => p.promo_text) || []);

      // Insert new promos
      const newPromos = result.promos
        .filter(p => !existingTexts.has(p.text))
        .map(p => ({
          competitor_id: competitorId,
          promo_text: p.text,
          discount_percent: p.discountPercent,
          discount_amount: p.discountAmount,
          promo_code: p.code,
          source_type: p.sourceType,
          is_active: true,
        }));

      if (newPromos.length > 0) {
        await supabaseAdmin.from('promos').insert(newPromos);
      }

      // Mark old promos as inactive if not in current scrape
      const currentTexts = new Set(result.promos.map(p => p.text));
      const promosToDeactivate = existingPromos
        ?.filter(p => !currentTexts.has(p.promo_text))
        .map(p => p.promo_text) || [];

      if (promosToDeactivate.length > 0) {
        await supabaseAdmin
          .from('promos')
          .update({ is_active: false, last_seen_at: new Date().toISOString() })
          .eq('competitor_id', competitorId)
          .in('promo_text', promosToDeactivate);
      }

      // Update last_seen_at for promos still active
      const promosToUpdate = existingPromos
        ?.filter(p => currentTexts.has(p.promo_text))
        .map(p => p.promo_text) || [];

      if (promosToUpdate.length > 0) {
        await supabaseAdmin
          .from('promos')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('competitor_id', competitorId)
          .in('promo_text', promosToUpdate);
      }
    }
  } catch (error) {
    console.error('Scrape error:', error);
    await supabaseAdmin
      .from('competitors')
      .update({ scrape_status: 'error' })
      .eq('id', competitorId);
  }
}
