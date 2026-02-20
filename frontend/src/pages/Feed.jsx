import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import Avatar from '../components/Avatar';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import Profile from './Profile';

export default function Feed() {
  const { user } = useAuth();
  const { toasts, add: toast } = useToast();
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState('feed'); // 'feed' | 'profile'

  useEffect(() => {
    api.getPosts()
      .then(({ posts }) => setPosts(posts))
      .catch(() => toast('Could not load posts'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = useCallback((post) => {
    setPosts(prev => [post, ...prev]);
    toast('Post published ✓');
  }, [toast]);

  const handleDelete = useCallback(async (postId) => {
    try {
      await api.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast('Post deleted');
    } catch (e) {
      toast(e.message);
    }
  }, [toast]);

  if (page === 'profile') {
    return (
      <>
        <Navbar onProfile={() => setPage('profile')} />
        <Profile onBack={() => setPage('feed')} />
        <Toasts toasts={toasts} />
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar onProfile={() => setPage('profile')} />

      <div className="layout">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="profile-card">
            <div className="profile-card__banner" />
            <div className="profile-card__body">
              <div className="profile-card__avatar-wrap">
                <Avatar name={user.name} color={user.avatar_color} size={52} />
              </div>
              <div className="profile-card__name serif">{user.name}</div>
              {user.headline && (
                <div className="profile-card__headline">{user.headline}</div>
              )}
              <div className="profile-card__divider" />
              <div className="profile-card__stat">
                Posts <span>{posts.filter(p => p.author.id === user.id).length}</span>
              </div>
              <div className="profile-card__stat">
                Member since <span>{new Date().getFullYear()}</span>
              </div>
              <button className="profile-card__edit" onClick={() => setPage('profile')}>
                View full profile
              </button>
            </div>
          </div>

          {/* Privacy reminder — minimal, no clutter */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-lg)', padding:'14px 16px' }}>
            <div style={{ fontFamily:'var(--serif)', fontSize:'0.78rem', marginBottom:8, color:'var(--text-2)' }}>
              Privacy
            </div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-3)', lineHeight:1.7 }}>
              Emails you share in comments are visible only to <strong style={{ color:'var(--text-2)' }}>you</strong> and the <strong style={{ color:'var(--amber)' }}>post author</strong>. Everyone else sees them hidden.
            </div>
          </div>
        </aside>

        {/* ── Main feed ── */}
        <main className="feed">
          <CreatePost onCreated={handleCreated} />

          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
              <div className="spinner" />
            </div>
          ) : posts.length === 0 ? (
            <div className="empty">
              No posts yet. Be the first to share an opportunity.
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} onDelete={handleDelete} />
            ))
          )}
        </main>
      </div>

      <Toasts toasts={toasts} />
    </div>
  );
}

function Toasts({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div className="toast" key={t.id}>{t.msg}</div>
      ))}
    </div>
  );
}
