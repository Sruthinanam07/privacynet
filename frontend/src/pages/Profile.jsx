import { useState } from 'react';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Profile({ onBack }) {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ name: user.name, headline: user.headline || '', bio: user.bio || '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setLoading(true);
    setErr('');
    try {
      const { user: updated } = await api.updateMe(form);
      updateUser(updated);
      setEditing(false);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="profile-page anim-in">
      <button
        onClick={onBack}
        style={{ display:'flex', alignItems:'center', gap:6, marginBottom:16,
          background:'transparent', border:'none', color:'var(--text-3)',
          fontSize:'0.75rem', cursor:'pointer' }}
      >
        ← Back to feed
      </button>

      <div className="profile-hero">
        <div className="profile-hero__banner" />
        <div className="profile-hero__body">
          <div className="profile-hero__avatar-wrap">
            <Avatar name={user.name} color={user.avatar_color} size={72} />
          </div>

          {editing ? (
            <div className="edit-form">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Headline</label>
                <input className="form-input" placeholder="e.g. CS Student · IIT Delhi"
                  value={form.headline} onChange={e => set('headline', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">About</label>
                <textarea className="form-input" rows={3} style={{ resize:'vertical' }}
                  placeholder="A short bio about yourself…"
                  value={form.bio} onChange={e => set('bio', e.target.value)} />
              </div>
              {err && <div className="form-error" style={{ marginBottom:8 }}>{err}</div>}
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary" onClick={save} disabled={loading}>
                  {loading ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="profile-hero__name serif">{user.name}</div>
              {user.headline && <div className="profile-hero__headline">{user.headline}</div>}
              <div style={{ fontSize:'0.68rem', color:'var(--text-3)', marginTop:4 }}>{user.email}</div>
              {user.bio && <div className="profile-hero__bio">{user.bio}</div>}
              <button
                className="btn btn-ghost"
                style={{ marginTop:14, fontSize:'0.72rem', padding:'6px 16px' }}
                onClick={() => setEditing(true)}
              >
                Edit profile
              </button>
            </>
          )}
        </div>
      </div>

      {/* Privacy explanation */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:'var(--radius-lg)', padding:18, marginTop:14 }}>
        <div style={{ fontFamily:'var(--serif)', fontSize:'0.9rem', marginBottom:10 }}>
          How your privacy is protected
        </div>
        <div style={{ fontSize:'0.74rem', color:'var(--text-3)', lineHeight:1.75 }}>
          When you comment your email or phone number on a job post, our AI agent detects it automatically — before it's saved to the database. The real value is stored in an encrypted vault. Everyone else sees <span style={{ color:'var(--text-2)' }}>[email hidden]</span> in your place.<br /><br />
          Only two people can see your real contact info: <strong style={{ color:'var(--text-2)' }}>you</strong> and the <strong style={{ color:'var(--amber)' }}>post author</strong> who needs it to follow up with you.
        </div>
      </div>
    </div>
  );
}
