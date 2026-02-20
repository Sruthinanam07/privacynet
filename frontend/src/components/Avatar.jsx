export default function Avatar({ name = '?', color = '#1e3a6e', size = 38 }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').slice(0, 2).join('');
  return (
    <div
      className="avatar"
      style={{
        width: size, height: size,
        background: color,
        fontSize: size * 0.32,
        border: `2px solid rgba(255,255,255,0.08)`,
      }}
    >
      {initials}
    </div>
  );
}
