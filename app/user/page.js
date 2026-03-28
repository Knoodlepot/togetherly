'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { MOODS, NEEDS, getMood, timeAgo } from '../../lib/utils';

export default function UserPage() {
  const router = useRouter();
  const [session, setSession]   = useState(null);
  const [status, setStatus]     = useState(null);
  const [screen, setScreen]     = useState('main'); // 'main' | 'mood' | 'needs'
  const [toast, setToast]       = useState(null);
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('togetherly_session');
    if (!saved) { router.replace('/'); return; }
    const sess = JSON.parse(saved);
    if (sess.userRole !== 'user') { router.replace('/family'); return; }
    setSession(sess);
    loadStatus(sess.familyCode);
  }, [router]);

  const loadStatus = useCallback(async (code) => {
    const { data } = await supabase
      .from('families')
      .select('*')
      .eq('code', code)
      .single();
    if (data) setStatus(data);
  }, []);

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  async function sendCheckin(type, extra = {}) {
    if (busy) return;
    setBusy(true);
    const { familyCode } = session;

    const familyUpdate = {
      last_checkin_type: type,
      last_checkin_at: new Date().toISOString(),
      ...(type === 'sos'  && { sos_active: true }),
      ...(type === 'okay' && { sos_active: false }),
      ...extra,
    };

    await supabase.from('families').update(familyUpdate).eq('code', familyCode);
    await supabase.from('checkins').insert({
      family_code: familyCode,
      type,
      mood:  extra.current_mood ?? null,
      needs: extra.active_needs ?? null,
    });

    // Fire push notification to family devices
    const messages = {
      sos:   { title: '🆘 SOS EMERGENCY', body: `${session.userName} needs emergency help RIGHT NOW!` },
      okay:  { title: '✅ All Good',       body: `${session.userName} has checked in — they're okay.` },
      help:  { title: '🙋 Needs Help',     body: `${session.userName} needs some help.` },
      mood:  { title: '😊 Mood Update',    body: `${session.userName} has shared how they're feeling.` },
      needs: { title: '🛒 Needs List',     body: `${session.userName} has updated their needs list.` },
    };
    const msg = messages[type] || { title: 'Togetherly', body: 'New update from ' + session.userName };
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyCode, title: msg.title, body: msg.body, type }),
    });

    setStatus(prev => ({ ...prev, ...familyUpdate }));
    setBusy(false);
  }

  if (!session) return <div className="loading-screen">Loading…</div>;

  const currentMood = status?.current_mood;
  const activeNeeds = status?.active_needs || [];
  const sosActive   = status?.sos_active || false;

  if (screen === 'mood') {
    return (
      <div className="screen">
        <div className="screen-header">
          <button className="back-btn" onClick={() => setScreen('main')}>← Back</button>
          <h2>How are you feeling?</h2>
        </div>
        <div className="mood-buttons">
          {MOODS.map(m => (
            <button
              key={m.id}
              className={`mood-btn${currentMood === m.id ? ' selected' : ''}`}
              onClick={async () => {
                await sendCheckin('mood', { current_mood: m.id });
                showToast(`${m.emoji} ${m.label} saved`, 'okay');
                setScreen('main');
              }}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'needs') {
    return (
      <NeedsScreen
        activeNeeds={activeNeeds}
        onSave={async (needs) => {
          await sendCheckin('needs', { active_needs: needs });
          if (needs.length > 0) showToast('Your list has been saved 🛒', 'okay');
          setScreen('main');
        }}
        onBack={() => setScreen('main')}
      />
    );
  }

  const moodObj   = getMood(currentMood);
  const moodText  = moodObj ? `${moodObj.emoji} ${moodObj.label}` : "How I'm Feeling";
  const needsText = activeNeeds.length > 0
    ? `${activeNeeds.length} thing${activeNeeds.length !== 1 ? 's' : ''} on my list`
    : 'I Need Something';

  return (
    <div className="screen">
      <div className="user-header">
        <h1>Hello, {session.userName}!</h1>
        <p className="user-subtitle">How are you doing today?</p>
      </div>

      <div className="main-buttons">
        <button
          className="btn-main btn-okay"
          onClick={async () => {
            await sendCheckin('okay');
            showToast("Your family knows you're okay ✅", 'okay');
          }}
        >
          ✅ &nbsp;I&apos;m Okay
        </button>

        <button
          className="btn-main btn-help"
          onClick={async () => {
            await sendCheckin('help');
            showToast('Your family has been notified 🙋', 'help');
          }}
        >
          🙋 &nbsp;I Need Help
        </button>

        <button
          className={`btn-main btn-sos${sosActive ? ' sos-active' : ''}`}
          onClick={() => {
            if (window.confirm(
              '⚠️ SOS — Emergency Alert\n\n' +
              'This will tell your family you need emergency help right now.\n\n' +
              'Press OK to send the alert.'
            )) {
              sendCheckin('sos');
              showToast('SOS sent! Your family has been alerted 🆘', 'sos');
            }
          }}
        >
          🆘 &nbsp;SOS — Emergency
        </button>

        <div className="secondary-buttons">
          <button className="btn-secondary btn-mood" onClick={() => setScreen('mood')}>
            😊<br />{moodText}
          </button>
          <button
            className={`btn-secondary btn-needs${activeNeeds.length > 0 ? ' has-items' : ''}`}
            onClick={() => setScreen('needs')}
          >
            🛒<br />{needsText}
          </button>
        </div>
      </div>

      {status?.last_checkin_at && (
        <div className="last-checkin">
          Last update: {timeAgo(status.last_checkin_at)}
        </div>
      )}

      <button className="switch-view" onClick={() => router.push('/family')}>
        Switch to Family View
      </button>

      {toast && (
        <div className={`feedback-toast toast-${toast.type} visible`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function NeedsScreen({ activeNeeds, onSave, onBack }) {
  const [selected, setSelected] = useState([...activeNeeds]);

  function toggle(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => onSave(selected)}>← Done</button>
        <h2>What do you need?</h2>
      </div>
      <p className="needs-hint">Tap each thing you need. Tap again to remove it.</p>
      <div className="needs-list">
        {NEEDS.map(n => (
          <button
            key={n.id}
            className={`need-item${selected.includes(n.id) ? ' selected' : ''}`}
            onClick={() => toggle(n.id)}
          >
            <span className="need-emoji">{n.emoji}</span>
            <span className="need-label">{n.label}</span>
            <span className="need-check">{selected.includes(n.id) ? '✓' : ''}</span>
          </button>
        ))}
      </div>
      <button className="btn-done" onClick={() => onSave(selected)}>Done</button>
    </div>
  );
}
