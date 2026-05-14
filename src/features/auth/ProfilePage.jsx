import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useSettings } from '../../shared/hooks/useSettings';

export default function ProfilePage({ session }) {
  const { darkMode, setDarkMode } = useSettings();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const email = session?.user?.email || '';
  const initial = (displayName || email || '?')[0].toUpperCase();

  useEffect(() => {
    const meta = session?.user?.user_metadata;
    if (meta?.display_name) setDisplayName(meta.display_name);
  }, [session]);

  async function handleSave() {
    setSaving(true);
    await supabase.auth.updateUser({ data: { display_name: displayName } });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div id="page-profile" className="page active">
      <div className="card">
        <div className="card-hd">Profile</div>
        <div className="card-bd" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24 }}>
          <div className="profile-avatar-lg">{initial}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{email}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">Settings</div>
        <div className="card-bd">
          <div className="settings-row">
            <label htmlFor="display-name" style={{ fontSize: 13, fontWeight: 600 }}>Display Name</label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="settings-input"
            />
          </div>
          <div className="settings-row">
            <button onClick={handleSave} disabled={saving} className="m-btn primary" style={{ width: '100%', padding: 10 }}>
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Name'}
            </button>
          </div>
          <hr className="sep" />
          <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Dark Mode</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <hr className="sep" />
          <div className="settings-row">
            <button onClick={handleSignOut} className="m-btn secondary btn-signout">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">About</div>
        <div className="card-bd" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Anisita</span><br />
          Trip planner · Real-time sync
        </div>
      </div>
    </div>
  );
}
