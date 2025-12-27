import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseEmail, matchSenderToCompetitor } from '@/lib/email-parser';
import { verifyWebhookSignature } from '@/lib/mailgun';

// Extract org subdomain from recipient email
// e.g., acme-7x9k@inbound.competitoredge.com -> acme-7x9k
function extractSubdomain(recipient: string): string | null {
  const match = recipient.match(/^([^@]+)@/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data from Mailgun
    const formData = await request.formData();

    // Verify webhook signature (if configured)
    const timestamp = formData.get('timestamp') as string;
    const token = formData.get('token') as string;
    const signature = formData.get('signature') as string;

    if (timestamp && token && signature) {
      if (!verifyWebhookSignature(timestamp, token, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Extract email data
    const recipient = formData.get('recipient') as string;
    const sender = formData.get('sender') as string;
    const from = formData.get('from') as string;
    const subject = formData.get('subject') as string;
    const bodyPlain = formData.get('body-plain') as string;
    const bodyHtml = formData.get('body-html') as string;
    const messageId = formData.get('Message-Id') as string;

    if (!recipient || !sender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find organization by email subdomain
    const subdomain = extractSubdomain(recipient);
    if (!subdomain) {
      console.log('Could not extract subdomain from recipient:', recipient);
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('email_subdomain', subdomain)
      .single();

    if (orgError || !org) {
      console.log('Organization not found for subdomain:', subdomain);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Match sender to a competitor
    const fromAddress = from || sender;
    const competitorId = await matchSenderToCompetitor(fromAddress, org.id, supabaseAdmin);

    if (!competitorId) {
      console.log('No matching competitor for sender:', fromAddress);
      // Still return 200 to acknowledge receipt, but don't store
      return NextResponse.json({ received: true, stored: false, reason: 'no_matching_competitor' });
    }

    // Parse email content
    const parsed = parseEmail(subject || '', fromAddress, bodyPlain || '', bodyHtml || '');

    // Check for duplicate by message ID
    if (messageId) {
      const { data: existing } = await supabaseAdmin
        .from('emails')
        .select('id')
        .eq('message_id', messageId)
        .single();

      if (existing) {
        return NextResponse.json({ received: true, stored: false, reason: 'duplicate' });
      }
    }

    // Store the email
    const { error: insertError } = await supabaseAdmin.from('emails').insert({
      competitor_id: competitorId,
      message_id: messageId,
      from_address: fromAddress,
      subject: parsed.subject,
      body_text: parsed.bodyText?.slice(0, 50000), // Limit size
      body_html: parsed.bodyHtml?.slice(0, 100000),
      campaign_type: parsed.campaignType,
      promo_code: parsed.promoCode,
      discount_percent: parsed.discountPercent,
      received_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Failed to store email:', insertError);
      return NextResponse.json({ error: 'Failed to store email' }, { status: 500 });
    }

    // Mark competitor as email subscribed
    await supabaseAdmin
      .from('competitors')
      .update({ email_subscribed: true })
      .eq('id', competitorId);

    // Create alert for promo emails
    if (parsed.campaignType === 'promo') {
      // Get competitor name for alert
      const { data: competitor } = await supabaseAdmin
        .from('competitors')
        .select('name, domain')
        .eq('id', competitorId)
        .single();

      if (competitor) {
        const discountText = parsed.discountPercent
          ? `${parsed.discountPercent}% off`
          : parsed.promoCode
          ? `Code: ${parsed.promoCode}`
          : 'New promotion';

        await supabaseAdmin.from('alerts').insert({
          org_id: org.id,
          competitor_id: competitorId,
          alert_type: 'new_promo',
          title: `${competitor.name} sent a promo email`,
          message: `Subject: "${parsed.subject?.slice(0, 100)}" - ${discountText}`,
          metadata: {
            email_subject: parsed.subject,
            promo_code: parsed.promoCode,
            discount_percent: parsed.discountPercent,
            campaign_type: parsed.campaignType,
          },
        });
      }
    }

    console.log(`Stored email from ${fromAddress} for competitor ${competitorId}`);

    return NextResponse.json({
      received: true,
      stored: true,
      campaignType: parsed.campaignType,
      promoCode: parsed.promoCode,
    });
  } catch (error: any) {
    console.error('Mailgun webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
