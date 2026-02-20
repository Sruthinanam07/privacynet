import { useState } from 'react';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onProfile }) {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);

  return (
    <nav className="nav">
      <div className="nav__brand serif">
        PrivacyNet <div className="nav__dot" />
      </div>

      <div className="nav__search">
        <input placeholder="Search…" />
      </div>

      <div className="nav__right">
        {user && (
          <div style={{ position: 'relative' }}>
            <button className="nav__avatar-btn" onClick={() => setMenu(m => !m)}>
              <Avatar name={user.name} color={user.avatar_color} size={27} />
              {user.name}
              <span>▾</span>
            </button>

            {menu && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--bg-card)', border: '1px solid var(--border-md)',
                  borderRadius: 'var(--radius)', minWidth: 160, zIndex: 400,
                  boxShadow: 'var(--shadow)', overflow: 'hidden',
                  animation: 'fadeUp 0.18s ease',
                }}
                onMouseLeave={() => setMenu(false)}
              >
                {[
                  { label: 'My Profile', action: () => { onProfile(); setMenu(false); } },
                  { label: 'Sign out',   action: () => { logout(); setMenu(false); },  danger: true },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    style={{
                      display: 'block', width: '100%', padding: '10px 16px',
                      background: 'transparent', border: 'none',
                      textAlign: 'left', fontSize: '0.76rem',
                      color: item.danger ? 'var(--red)' : 'var(--text-2)',
                      borderBottom: i === 0 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
