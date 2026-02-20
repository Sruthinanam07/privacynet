import { useState } from 'react';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function CreatePost({ onCreated }) {
  const { user } = useAuth();
  const [open, setOpen]       = useState(false);
  const [content, setContent] = useState('');
  const [tag, setTag]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { post } = await api.createPost(content.trim(), tag.trim());
      onCreated(post);
      setContent('');
      setTag('');
      setOpen(false);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="create-post anim-up">
        <div className="create-post__row">
          <Avatar name={user?.name} color={user?.avatar_color} size={40} />
          <button className="create-post__input" onClick={() => setOpen(true)}>
            Share a job, internship or opportunity…
          </button>
        </div>
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__title">
              <span className="serif">Share an opportunity</span>
              <button className="modal__close" onClick={() => setOpen(false)}>×</button>
            </div>

            <div style={{ display:'flex', gap:11, marginBottom:12 }}>
              <Avatar name={user?.name} color={user?.avatar_color} size={40} />
              <div>
                <div style={{ fontFamily:'var(--serif)', fontSize:'0.9rem' }}>{user?.name}</div>
                <div style={{ fontSize:'0.68rem', color:'var(--text-3)', marginTop:2 }}>{user?.headline || 'PrivacyNet member'}</div>
              </div>
            </div>

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={"Tell people about the opportunity.\nAsk interested people to drop their email in the comments — the AI agent will protect it automatically."}
              autoFocus
            />

            <div className="modal__tag-row">
              <input
                value={tag}
                onChange={e => setTag(e.target.value)}
                placeholder="#Hiring, #Internship…"
              />
              <span style={{ fontSize:'0.66rem', color:'var(--text-3)' }}>
                Comments with emails will be masked from other viewers automatically.
              </span>
            </div>

            {error && <div className="form-error" style={{ marginTop:8 }}>{error}</div>}

            <div className="modal__footer">
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={!content.trim() || loading}
              >
                {loading ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
