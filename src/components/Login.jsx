import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8f7f4' }}>
      <form onSubmit={handleSubmit} className="modal" style={{ display: 'block', maxWidth: 360, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
        <h3 className="font-display" style={{ fontSize: 24, fontWeight: 400, marginBottom: 4, color: '#1C1917' }}>Anisita</h3>
        <p style={{ fontSize: 13, color: '#78716C', marginBottom: 16 }}>🇪🇸🇮🇹 Our Spain & Italy adventure planner</p>
        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <input
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d6d3d1', borderRadius: 6, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
        />
        <input
          type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d6d3d1', borderRadius: 6, fontSize: 14, marginBottom: 14, boxSizing: 'border-box' }}
        />
        <button type="submit" disabled={loading} className="m-btn primary" style={{ width: '100%', padding: 12, fontSize: 14 }}>
          {loading ? '...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
        <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }} style={{ background: 'none', border: 'none', color: '#ea580c', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10, width: '100%', textAlign: 'center' }}>
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </form>
    </div>
  );
}
