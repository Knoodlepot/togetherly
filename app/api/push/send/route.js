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

export async function POST(req) {
  const { familyCode, title, body, type } = await req.json();

  if (!familyCode) {
    return NextResponse.json({ error: 'Missing familyCode' }, { status: 400 });
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .eq('family_code', familyCode);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const payload = JSON.stringify({ title, body, type });

  const results = await Promise.allSettled(
    subs.map(({ subscription }) => webpush.sendNotification(subscription, payload))
  );

  // Remove expired/invalid subscriptions
  const expiredEndpoints = results
    .map((r, i) => (r.status === 'rejected' ? subs[i].endpoint : null))
    .filter(Boolean);

  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);
  }

  const sent = results.filter(r => r.status === 'fulfilled').length;
  return NextResponse.json({ ok: true, sent });
}
