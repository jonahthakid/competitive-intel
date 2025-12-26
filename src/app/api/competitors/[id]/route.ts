import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE /api/competitors/[id] - Delete a competitor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const competitorId = params.id;

    // Verify ownership
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
      .select('id')
      .eq('id', competitorId)
      .eq('org_id', org.id)
      .single();

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    // Delete competitor (cascade will delete promos and emails)
    const { error } = await supabaseAdmin
      .from('competitors')
      .delete()
      .eq('id', competitorId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting competitor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete competitor' },
      { status: 500 }
    );
  }
}
