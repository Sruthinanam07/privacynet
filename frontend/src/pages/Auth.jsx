import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const { login, register } = useAuth();
  const [mode, setMode]     = useState('login'); // 'login' | 'register'
  const [form, setForm]     = useState({ name:'', email:'', password:'', headline:'' });
  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState('');
  const [loading, setLoading]     = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (mode === 'register' && !form.name.trim())  e.name     = 'Name is required';
    if (!form.email.trim())                          e.email    = 'Email is required';
    if (!form.password)                              e.password = 'Password is required';
    if (mode === 'register' && form.password.length < 6) e.password = 'At least 6 characters';
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    setServerErr('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password, form.headline);
      }
    } catch (err) {
      setServerErr(err.message);
    }
    setLoading(false);
  };

  const onKey = e => { if (e.key === 'Enter') submit(); };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo serif">
          PrivacyNet <div className="dot" />
        </div>
        <p className="auth-tagline">
          {mode === 'login'
            ? 'Sign back in to your account.'
            : 'Create an account to share jobs and opportunities — contact info in comments stays private automatically.'}
        </p>

        {mode === 'register' && (
          <>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                placeholder="Your full name"
                value={form.name} onChange={e => set('name', e.target.value)} onKeyDown={onKey} />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Headline <span style={{ color:'var(--text-3)' }}>(optional)</span></label>
              <input className="form-input"
                placeholder="e.g. CS Student · IIT Delhi"
                value={form.headline} onChange={e => set('headline', e.target.value)} onKeyDown={onKey} />
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input className={`form-input ${errors.email ? 'form-input--error' : ''}`}
            type="email" placeholder="you@example.com"
            value={form.email} onChange={e => set('email', e.target.value)} onKeyDown={onKey} />
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input className={`form-input ${errors.password ? 'form-input--error' : ''}`}
            type="password" placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
            value={form.password} onChange={e => set('password', e.target.value)} onKeyDown={onKey} />
          {errors.password && <div className="form-error">{errors.password}</div>}
        </div>

        {serverErr && (
          <div className="form-error" style={{ marginBottom: 10, padding:'8px 12px',
            background:'rgba(192,57,43,0.08)', border:'1px solid rgba(192,57,43,0.2)',
            borderRadius:'var(--radius)' }}>
            {serverErr}
          </div>
        )}

        <button className="btn btn-primary form-submit" onClick={submit} disabled={loading}>
          {loading
            ? <><div className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Hang on…</>
            : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <div className="auth-switch">
          {mode === 'login'
            ? <>Don't have an account? <button onClick={() => { setMode('register'); setServerErr(''); setErrors({}); }}>Register</button></>
            : <>Already have an account? <button onClick={() => { setMode('login'); setServerErr(''); setErrors({}); }}>Sign in</button></>}
        </div>
      </div>
    </div>
  );
}
