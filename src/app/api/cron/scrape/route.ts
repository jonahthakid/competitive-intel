import { NextRequest, NextResponse } from 'next/server';
import { runScheduledScrapes } from '@/lib/scheduler';
import { checkAndCreateAlerts } from '@/lib/alerts';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If no secret is set, allow in development
  if (!cronSecret && process.env.NODE_ENV === 'development') {
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Run scheduled scrapes
    const scrapeResults = await runScheduledScrapes(5);

    // Check for new alerts after scraping
    const alertsCreated = await checkAndCreateAlerts();

    const duration = Date.now() - startTime;

    console.log(`Cron job completed in ${duration}ms:`, {
      scrapes: scrapeResults,
      alertsCreated,
    });

    return NextResponse.json({
      success: true,
      duration,
      scrapes: scrapeResults,
      alertsCreated,
    });
  } catch (error: any) {
    console.error('Cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
