import { useState } from 'react';

export default function PiiChip({ content, visibility, piiType }) {
  const [tip, setTip] = useState(false);

  const cfg = {
    masked: { cls: 'pii-chip--masked', icon: '···', label: `[${piiType} hidden]`,
      tip: 'Hidden by Privacy Agent', sub: 'Only the commenter and post author can see this' },
    self:   { cls: 'pii-chip--self',   icon: '◉', label: content,
      tip: 'Visible to you', sub: 'Hidden from all other viewers' },
    owner:  { cls: 'pii-chip--owner',  icon: '◆', label: content,
      tip: 'Visible — you own this post', sub: 'Commenters only see their own' },
  };

  const c = cfg[visibility] || cfg.masked;

  return (
    <span
      className={`pii-chip ${c.cls}`}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      <span style={{ opacity: 0.6, fontSize: '0.7em' }}>{c.icon}</span>
      {c.label}
      {tip && (
        <span className="pii-tip">
          {c.tip}
          <br />
          <span style={{ color: 'var(--text-3)', fontSize: '0.88em' }}>{c.sub}</span>
        </span>
      )}
    </span>
  );
}
