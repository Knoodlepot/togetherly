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

const INACTIVITY_HOURS = 24;

export async function GET(req) {
  // Vercel calls cron routes via GET with the secret in the Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find families inactive for 24h that haven't been notified yet for this period
  const threshold = new Date(Date.now() - INACTIVITY_HOURS * 3600000).toISOString();

  const { data: families, error } = await supabase
    .from('families')
    .select('code, user_name, last_checkin_at, inactivity_notified_at')
    .lt('last_checkin_at', threshold)
    .or('inactivity_notified_at.is.null,inactivity_notified_at.lt.last_checkin_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!families || families.length === 0) return NextResponse.json({ ok: true, notified: 0 });

  let notified = 0;

  for (const family of families) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('family_code', family.code);

    if (!subs || subs.length === 0) continue;

    const payload = JSON.stringify({
      title: `👋 Have you heard from ${family.user_name}?`,
      body: `${family.user_name} hasn't checked in for over ${INACTIVITY_HOURS} hours. It might be worth giving them a call.`,
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

  return NextResponse.json({ ok: true, notified });
}
