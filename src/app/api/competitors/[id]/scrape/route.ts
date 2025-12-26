import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';
import { scrapeHomepage } from '@/lib/scraper';

// POST /api/competitors/[id]/scrape - Trigger a scrape for a competitor
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const competitorId = params.id;

    // Verify ownership and get competitor
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { data: competitor } = await supabaseAdmin
      .from('competitors')
      .select('*')
      .eq('id', competitorId)
      .eq('org_id', org.id)
      .single();

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    // Perform scrape
    const result = await scrapeHomepage(competitor.homepage_url);

    // Update competitor status
    await supabaseAdmin
      .from('competitors')
      .update({
        scrape_status: result.success ? 'active' : 'error',
        last_scraped_at: new Date().toISOString(),
      })
      .eq('id', competitorId);

    if (result.success && result.promos.length > 0) {
      // Get existing active promos
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

      // Mark old promos as inactive
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

    return NextResponse.json({
      success: result.success,
      promosFound: result.promos.length,
      error: result.error,
    });
  } catch (error: any) {
    console.error('Error scraping competitor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape competitor' },
      { status: 500 }
    );
  }
}
