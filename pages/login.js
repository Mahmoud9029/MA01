import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [mode, setMode] = useState('password'); // 'password' | 'magiclink'
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError(''); setMessage('');
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Konto erstellt! Du bist jetzt angemeldet.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    setError(''); setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setMessage('Check dein Postfach — wir haben dir einen Login-Link geschickt.');
  }

  async function handleGoogle() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="login-wrap">
      <h1 style={{ fontSize: 26 }}>Trainingsnotizen</h1>
      <p className="subtitle">Melde dich an, um deine Trainingsdaten zu sehen.</p>

      <button onClick={handleGoogle} className="google-btn">
        <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 8 }}>
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 009 18z"/>
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.17.27-1.7V4.97H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
        </svg>
        Mit Google anmelden
      </button>

      <div className="login-divider"><span>oder</span></div>

      <div className="login-mode-toggle">
        <button className={mode === 'password' ? 'active' : ''} onClick={() => { setMode('password'); setError(''); setMessage(''); }}>Passwort</button>
        <button className={mode === 'magiclink' ? 'active' : ''} onClick={() => { setMode('magiclink'); setError(''); setMessage(''); }}>Magic Link</button>
      </div>

      {mode === 'password' ? (
        <form onSubmit={handlePasswordSubmit}>
          <input type="email" placeholder="deine@email.de" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="submit">{isSignUp ? 'Konto erstellen' : 'Anmelden'}</button>
          <p className="login-switch" onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}>
            {isSignUp ? 'Schon ein Konto? Anmelden' : 'Noch kein Konto? Registrieren'}
          </p>
        </form>
      ) : (
        <form onSubmit={handleMagicLink}>
          <input type="email" placeholder="deine@email.de" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit">Link senden</button>
        </form>
      )}

      {message && <p style={{ color: 'var(--forest)' }}>{message}</p>}
      {error && <p style={{ color: 'var(--accent)' }}>{error}</p>}
    </div>
  );
}
