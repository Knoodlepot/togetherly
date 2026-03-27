'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { generateCode } from '../lib/utils';

export default function SetupPage() {
  const router = useRouter();
  const [mounted, setMounted]   = useState(false);
  const [name, setName]         = useState('');
  const [code, setCode]         = useState('');
  const [role, setRole]         = useState(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('togetherly_session');
    if (saved) {
      const { userRole } = JSON.parse(saved);
      router.replace(userRole === 'user' ? '/user' : '/family');
    }
  }, [router]);

  function pickRole(r) {
    setRole(r);
    setError('');
    if (r === 'user') setCode(generateCode());
    else setCode('');
  }

  async function handleStart() {
    if (!name.trim())            return setError('Please enter a name.');
    if (!role)                   return setError('Please choose who you are.');
    if (code.trim().length < 6)  return setError('Please enter or generate a 6-letter code.');

    setLoading(true);
    setError('');
    const familyCode = code.trim().toUpperCase();

    if (role === 'user') {
      // Create the family record in Supabase
      const { error: dbErr } = await supabase
        .from('families')
        .upsert({ code: familyCode, user_name: name.trim() }, { onConflict: 'code' });

      if (dbErr) {
        setLoading(false);
        return setError('Could not connect. Check your internet and try again.');
      }
    } else {
      // Verify the family code exists
      const { data } = await supabase
        .from('families')
        .select('code, user_name')
        .eq('code', familyCode)
        .single();

      if (!data) {
        setLoading(false);
        return setError('That code was not found. Please check it and try again.');
      }
    }

    localStorage.setItem('togetherly_session', JSON.stringify({
      userName: name.trim(),
      familyCode,
      userRole: role,
    }));

    router.push(role === 'user' ? '/user' : '/family');
  }

  // Avoid hydration mismatch — don't render form until client
  if (!mounted) return <div className="loading-screen">Loading…</div>;

  return (
    <div className="screen setup-screen">
      <div>
        <div className="app-logo">🤝</div>
        <div className="app-title">Togetherly</div>
        <div className="app-subtitle">Staying connected with the people you love</div>
      </div>

      <div className="setup-form">
        {error && <p className="error-msg">{error}</p>}

        <div className="form-group">
          <label htmlFor="name-input">
            Name of the person being checked in
          </label>
          <input
            id="name-input"
            type="text"
            placeholder="e.g. Margaret"
            autoComplete="given-name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <div className="role-label">I am a…</div>
          <div className="role-buttons">
            <button
              className={`role-btn${role === 'user' ? ' selected' : ''}`}
              onClick={() => pickRole('user')}
            >
              <span className="role-icon">👴</span>
              <span className="role-text">Person being<br />checked in</span>
            </button>
            <button
              className={`role-btn${role === 'family' ? ' selected' : ''}`}
              onClick={() => pickRole('family')}
            >
              <span className="role-icon">👨‍👩‍👧</span>
              <span className="role-text">Family member<br />or carer</span>
            </button>
          </div>
        </div>

        {role === 'user' && (
          <div className="form-group">
            <label>Your family code</label>
            <input
              type="text"
              value={code}
              readOnly
              style={{ letterSpacing: '0.25em', fontWeight: 800, fontSize: '1.8rem' }}
            />
            <p className="code-hint">
              Share this code with your family so they can see your updates.
            </p>
          </div>
        )}

        {role === 'family' && (
          <div className="form-group">
            <label>Family code</label>
            <input
              type="text"
              placeholder="e.g. ABC123"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ letterSpacing: '0.25em', fontWeight: 800, fontSize: '1.8rem' }}
            />
            <p className="code-hint">
              Enter the 6-letter code from the person you are caring for.
            </p>
          </div>
        )}

        <button
          className="btn-start"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? 'Connecting…' : 'Get Started →'}
        </button>
      </div>
    </div>
  );
}
