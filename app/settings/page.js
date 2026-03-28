'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const THRESHOLD_OPTIONS = [
  { value: 6,  label: '6 hours' },
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '2 days' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession]     = useState(null);
  const [name, setName]           = useState('');
  const [threshold, setThreshold] = useState(24);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('togetherly_session');
    if (!saved) { router.replace('/'); return; }
    const sess = JSON.parse(saved);
    setSession(sess);
    setName(sess.userName || '');
    loadThreshold(sess.familyCode);
  }, [router]);

  async function loadThreshold(code) {
    const { data } = await supabase
      .from('families')
      .select('inactivity_hours')
      .eq('code', code)
      .single();
    if (data?.inactivity_hours) setThreshold(data.inactivity_hours);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function saveName() {
    if (!name.trim()) return;
    setSaving(true);
    await supabase
      .from('families')
      .update({ user_name: name.trim() })
      .eq('code', session.familyCode);
    const updated = { ...session, userName: name.trim() };
    localStorage.setItem('togetherly_session', JSON.stringify(updated));
    setSession(updated);
    setSaving(false);
    showToast('Name updated ✓');
  }

  async function saveThreshold(hours) {
    setThreshold(hours);
    await supabase
      .from('families')
      .update({ inactivity_hours: hours })
      .eq('code', session.familyCode);
    showToast(`Alert set to ${hours} hours ✓`);
  }

  function leaveFamily() {
    if (!window.confirm(
      'Leave this family?\n\nThis will remove the app from this device. The family code and data will still exist for other devices.'
    )) return;
    localStorage.removeItem('togetherly_session');
    router.replace('/');
  }

  async function deleteAllData() {
    const confirmation = window.prompt(
      'This will permanently delete ALL data for this family — check-in history, settings, and everything stored.\n\nThis cannot be undone.\n\nType DELETE to confirm.'
    );
    if (confirmation !== 'DELETE') return;

    await Promise.all([
      supabase.from('checkins').delete().eq('family_code', session.familyCode),
      supabase.from('push_subscriptions').delete().eq('family_code', session.familyCode),
    ]);
    await supabase.from('families').delete().eq('code', session.familyCode);

    localStorage.removeItem('togetherly_session');
    router.replace('/');
  }

  if (!session) return <div className="loading-screen">Loading…</div>;

  const returnPath = session.userRole === 'family' ? '/family' : '/user';

  return (
    <div className="screen settings-screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => router.push(returnPath)}>← Back</button>
        <h2>Settings</h2>
      </div>

      <div className="settings-body">

        {/* Name */}
        <div className="settings-section">
          <div className="settings-label">Display name</div>
          <div className="settings-row">
            <input
              className="settings-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              maxLength={30}
            />
            <button
              className="settings-save-btn"
              onClick={saveName}
              disabled={saving || !name.trim() || name.trim() === session.userName}
            >
              Save
            </button>
          </div>
        </div>

        {/* Inactivity threshold — only shown to family role */}
        {session.userRole === 'family' && (
          <div className="settings-section">
            <div className="settings-label">Alert me if no check-in after</div>
            <div className="threshold-options">
              {THRESHOLD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`threshold-btn${threshold === opt.value ? ' selected' : ''}`}
                  onClick={() => saveThreshold(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="settings-hint">
              You&apos;ll get a push notification if {session.userName || 'the user'} hasn&apos;t checked in within this time.
            </p>
          </div>
        )}

        {/* Family code */}
        <div className="settings-section">
          <div className="settings-label">Family code</div>
          <div className="settings-code">{session.familyCode}</div>
          <p className="settings-hint">Share this with family members so they can connect on their device.</p>
        </div>

        {/* Leave */}
        <div className="settings-section settings-danger">
          <button className="settings-leave-btn" onClick={leaveFamily}>
            Leave this family
          </button>
          <p className="settings-hint">Removes the app from this device only. Other devices keep their access.</p>
        </div>

        {/* Privacy notice */}
        <div className="settings-section">
          <div className="settings-label">Legal</div>
          <a href="/privacy" className="settings-privacy-link">Read our Privacy Notice →</a>
        </div>

        {/* Delete all data */}
        <div className="settings-section settings-danger">
          <button className="settings-delete-btn" onClick={deleteAllData}>
            Delete all my data
          </button>
          <p className="settings-hint">Permanently deletes all check-in history, settings, and stored data for this family from our servers. Cannot be undone.</p>
        </div>

      </div>

      {toast && (
        <div className="feedback-toast toast-okay visible">{toast}</div>
      )}
    </div>
  );
}
