import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(req) {
  // Vercel calls cron routes via GET with the secret in the Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all families that have checked in at least once
  const { data: families, error } = await supabase
    .from('families')
    .select('code, user_name, last_checkin_at, inactivity_notified_at, inactivity_hours')
    .not('last_checkin_at', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!families || families.length === 0) return NextResponse.json({ ok: true, notified: 0 });

  // Filter to families that are overdue and haven't been notified for this period
  const now = Date.now();
  const overdue = families.filter(f => {
    const hours = f.inactivity_hours || 24;
    const lastCheckin = new Date(f.last_checkin_at).getTime();
    if (now - lastCheckin < hours * 3600000) return false; // still active
    if (f.inactivity_notified_at) {
      const notifiedAt = new Date(f.inactivity_notified_at).getTime();
      if (notifiedAt > lastCheckin) return false; // already notified for this period
    }
    return true;
  });

  if (overdue.length === 0) return NextResponse.json({ ok: true, notified: 0 });

  let notified = 0;

  for (const family of overdue) {
    const hours = family.inactivity_hours || 24;
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('family_code', family.code);

    if (!subs || subs.length === 0) continue;

    const payload = JSON.stringify({
      title: `👋 Have you heard from ${family.user_name}?`,
      body: `${family.user_name} hasn't checked in for over ${hours} hours. It might be worth giving them a call.`,
      type: 'inactivity',
    });

    const results = await Promise.allSettled(
      subs.map(({ subscription }) => webpush.sendNotification(subscription, payload))
    );

    // Clean up expired subscriptions
    const expired = results
      .map((r, i) => (r.status === 'rejected' ? subs[i].endpoint : null))
      .filter(Boolean);
    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired);
    }

    // Mark as notified
    await supabase
      .from('families')
      .update({ inactivity_notified_at: new Date().toISOString() })
      .eq('code', family.code);

    notified++;
  }

  // Delete check-in history older than 90 days (storage limitation — UK GDPR)
  const cutoff = new Date(Date.now() - 90 * 24 * 3600000).toISOString();
  await supabase.from('checkins').delete().lt('created_at', cutoff);

  return NextResponse.json({ ok: true, notified });
}
