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
    <div className="login-screen">
      <form onSubmit={handleSubmit} className="login-card">
        <svg width="160" height="36" viewBox="-1 0 66 24" fill="none" aria-label="Anisita" role="img" style={{ margin: '0 auto 4px' }}>
          <title>Anisita</title>
          <path d="M6.5 4 C6.5 12, 15 20, 15 20 L23 20 L27 20 L31 20 L40 20 L46.5 20 L61 20" stroke="#7C3AED" strokeWidth="0.5" strokeDasharray="1.5 2" strokeLinecap="round" opacity="0.2"/>
          <g stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M2 20 L6.5 5 L11 20"/>
            <path d="M3.8 15 L9.2 15"/>
            <path d="M15 20 L15 11.5 Q15 8.5 19 8.5 Q23 8.5 23 11.5 L23 20"/>
            <path d="M27 9 L27 20"/>
            <path d="M36 10 Q35.5 8.5 33.5 8.5 Q31 8.5 31 10.5 Q31 12.5 33.5 13.5 Q36 14.5 36 16.5 Q36 20 33.5 20 Q31 20 31 17.5"/>
            <path d="M40 9 L40 20"/>
            <path d="M46.5 5 L46.5 17.5 Q46.5 20 49 20"/>
            <path d="M44 9 L49 9"/>
            <path d="M61 10.5 Q60.5 8.5 57 8.5 Q53 8.5 53 12 L53 16 Q53 20 57 20 Q61 20 61 16.5 L61 9 L61 20"/>
          </g>
          <circle cx="27" cy="5.5" r="1.3" fill="#7C3AED"/>
          <circle cx="40" cy="5.5" r="1.3" fill="#7C3AED"/>
          <circle cx="6.5" cy="4" r="2.5" fill="#7C3AED" opacity="0.15"/>
          <circle cx="6.5" cy="4" r="1.2" fill="#7C3AED"/>
          <circle cx="61" cy="20" r="2.5" fill="#22C55E" opacity="0.15"/>
          <circle cx="61" cy="20" r="1.2" fill="#22C55E"/>
        </svg>
        <p className="login-subtitle">Plan your next adventure</p>
        {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <input type="email" className="login-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" className="login-input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <button type="submit" disabled={loading} className="login-submit">
          {loading ? '...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
        <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="login-toggle">
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </form>
    </div>
  );
}
