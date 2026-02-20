import { useState, useRef, useCallback } from 'react';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

// Local regex pre-scan for instant UI feedback only.
// REAL PII detection runs server-side via Claude AI on submit.
function quickScan(text) {
  const EMAIL  = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
  const PHONE  = /(\+?\d[\d\s\-().]{7,}\d)/;
  const OBFUSC = /\b(at)\b.{1,30}\b(dot)\b.{1,10}\b(com|net|org|io)\b/i;
  const hasPII = EMAIL.test(text) || PHONE.test(text) || OBFUSC.test(text);
  return { hasPII };
}

export default function CommentBox({ postId, onSubmit }) {
  const { user } = useAuth();
  const [text, setText]         = useState('');
  const [hint, setHint]         = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef(null);
  const taRef       = useRef(null);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setText(val);
    const el = taRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setHint(null); return; }

    debounceRef.current = setTimeout(() => {
      const r = quickScan(val);
      setHint({ status: r.hasPII ? 'found' : 'clean' });
    }, 400);
  }, []);

  const handleSubmit = useCallback(async () => {
    const t = text.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    setText('');
    setHint(null);
    if (taRef.current) taRef.current.style.height = 'auto';
    await onSubmit(postId, t);
    setSubmitting(false);
  }, [text, submitting, postId, onSubmit]);

  const wrapCls = hint?.status === 'found' ? 'comment-input--found' : '';

  return (
    <div className={`comment-input ${wrapCls}`}>
      <Avatar name={user?.name} color={user?.avatar_color} size={30} />
      <div className="comment-input__inner">
        <textarea
          ref={taRef}
          value={text}
          onChange={handleChange}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Add a comment — contact info will be protected…"
          rows={1}
        />

        {hint && (
          <div className={`ci-hint ci-hint--${hint.status}`}>
            {hint.status === 'found' && <>🔒 Contact info detected — AI agent will mask it before saving</>}
            {hint.status === 'clean' && <>✓ No personal info detected</>}
          </div>
        )}

        <div className="ci-row">
          <span className="ci-hint-text">Enter to post · Shift+Enter for newline</span>
          <button
            className={`btn ${text.trim() && !submitting ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 16px', fontSize: '0.72rem' }}
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
