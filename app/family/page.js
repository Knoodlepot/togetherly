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

  function requestNotifications() {
    Notification?.requestPermission();
  }

  if (!session || !status) return <div className="loading-screen">Loading…</div>;

  const { user_name, last_checkin_type, last_checkin_at, current_mood, active_needs, sos_active } = status;
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

      {/* Notification prompt */}
      {typeof window !== 'undefined' && Notification?.permission === 'default' && (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <button
            onClick={requestNotifications}
            style={{
              background: 'none',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 20px',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--text-medium)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            🔔 Enable SOS notifications
          </button>
        </div>
      )}

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
