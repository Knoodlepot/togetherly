'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import {
  getMood, getNeed,
  timeAgo, formatTime,
  getCardClass, getStatusIcon, getStatusText, getHistoryText,
} from '../../lib/utils';

export default function FamilyPage() {
  const router = useRouter();
  const [session, setSession]     = useState(null);
  const [status, setStatus]       = useState(null);
  const [history, setHistory]     = useState([]);
  const [toast, setToast]         = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('togetherly_session');
    if (!saved) { router.replace('/'); return; }
    const sess = JSON.parse(saved);
    setSession(sess);
    loadData(sess.familyCode);
    subscribeToUpdates(sess.familyCode);
    subscribeToPush(sess.familyCode);
  }, [router]);

  const loadData = useCallback(async (code) => {
    const [{ data: family }, { data: checkins }] = await Promise.all([
      supabase.from('families').select('*').eq('code', code).single(),
      supabase
        .from('checkins')
        .select('*')
        .eq('family_code', code)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    if (family)   setStatus(family);
    if (checkins) setHistory(checkins);
  }, []);

  function subscribeToUpdates(code) {
    const channel = supabase
      .channel(`family-${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'families', filter: `code=eq.${code}` },
        (payload) => {
          setStatus(payload.new);
          // Reload history too so new check-ins appear
          loadData(code);
          // Push browser notification on SOS
          if (payload.new.sos_active && !payload.old?.sos_active) {
            if (Notification?.permission === 'granted') {
              new Notification('🆘 SOS Alert — Togetherly', {
                body: `${payload.new.user_name} needs emergency help right now!`,
                requireInteraction: true,
              });
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function dismissSOS() {
    if (!window.confirm('Mark this SOS as handled?\n\nThis will clear the alert.')) return;
    await supabase
      .from('families')
      .update({ sos_active: false })
      .eq('code', session.familyCode);
    setStatus(prev => ({ ...prev, sos_active: false }));
  }

  async function clearNeeds() {
    await supabase
      .from('families')
      .update({ active_needs: [] })
      .eq('code', session.familyCode);
    setStatus(prev => ({ ...prev, active_needs: [] }));
    showToast('Needs marked as done ✓', 'okay');
  }

  async function subscribeToPush(familyCode) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyCode, subscription: sub.toJSON() }),
      });
    } catch (e) {
      console.warn('Push subscription failed:', e);
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
    return output;
  }

  if (!session || !status) return <div className="loading-screen">Loading…</div>;

  const { user_name, last_checkin_type, last_checkin_at, current_mood, active_needs, sos_active } = status;

  const inactivityLevel = (() => {
    if (!last_checkin_at) return 'none';
    const hours = (Date.now() - new Date(last_checkin_at).getTime()) / 3600000;
    if (hours >= 24) return 'red';
    if (hours >= 12) return 'amber';
    return 'none';
  })();
  const needs    = active_needs || [];
  const moodObj  = getMood(current_mood);

  return (
    <div className="screen">
      {/* SOS Banner */}
      {sos_active && (
        <div className="sos-banner" onClick={dismissSOS}>
          <div className="sos-banner-icon">🆘</div>
          <div className="sos-banner-text">
            <strong>SOS ALERT</strong>
            {user_name} needs emergency help right now!
          </div>
          <button
            className="sos-dismiss"
            onClick={e => { e.stopPropagation(); dismissSOS(); }}
          >
            Handled
          </button>
        </div>
      )}

      {/* Inactivity warning */}
      {!sos_active && inactivityLevel !== 'none' && (
        <div className={`inactivity-banner inactivity-${inactivityLevel}`}>
          <span className="inactivity-icon">{inactivityLevel === 'red' ? '🔴' : '⚠️'}</span>
          <span className="inactivity-text">
            {inactivityLevel === 'red'
              ? `No check-in for over a day — please check on ${user_name}`
              : `No check-in for ${Math.floor((Date.now() - new Date(last_checkin_at).getTime()) / 3600000)} hours — have you heard from ${user_name}?`
            }
          </span>
        </div>
      )}

      {/* Header */}
      <div className="family-header">
        <h1>{user_name}&apos;s Status</h1>
        <button
          className="refresh-btn"
          onClick={() => loadData(session.familyCode)}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="status-cards">
        {/* Latest check-in */}
        <div className={`card ${getCardClass(last_checkin_type)}`}>
          <div className="card-label">Latest Check-in</div>
          <div className="card-value">
            {getStatusIcon(last_checkin_type)} {getStatusText(last_checkin_type)}
          </div>
          <div className="card-time">
            {last_checkin_at ? timeAgo(last_checkin_at) : 'No check-ins yet'}
          </div>
          {last_checkin_at && (
            <div className="card-detail">{formatTime(last_checkin_at)}</div>
          )}
        </div>

        {/* Mood */}
        <div className="card card-mood">
          <div className="card-label">How They&apos;re Feeling</div>
          <div className="card-value">
            {moodObj ? `${moodObj.emoji} ${moodObj.label}` : '— Not shared yet'}
          </div>
        </div>

        {/* Needs */}
        {needs.length > 0 && (
          <div className="card card-needs">
            <div className="card-label">Needs Help With</div>
            <div className="needs-tags">
              {needs.map(id => {
                const n = getNeed(id);
                return n ? (
                  <span key={id} className="need-tag">{n.emoji} {n.label}</span>
                ) : null;
              })}
            </div>
            <button className="btn-clear-needs" onClick={clearNeeds}>
              ✓ Mark as done
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <div className="section-title">Recent Activity</div>
      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-state">No activity yet — waiting for a check-in</div>
        ) : history.map(c => (
          <div key={c.id} className={`history-item ${getCardClass(c.type)}`}>
            <span className="history-icon">{getStatusIcon(c.type)}</span>
            <div className="history-content">
              <span className="history-text">{getHistoryText(c)}</span>
              <span className="history-time">{timeAgo(c.created_at)}</span>
            </div>
          </div>
        ))}
      </div>


      <button className="switch-view" onClick={() => router.push('/user')}>
        Switch to User View
      </button>

      {toast && (
        <div className={`feedback-toast toast-${toast.type} visible`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
