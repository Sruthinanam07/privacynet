import { useState, useEffect, useCallback } from 'react';
import Avatar from './Avatar';
import CommentText from './CommentText';
import CommentBox from './CommentBox';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [comments, setComments]     = useState(null); // null = not loaded
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked]           = useState(post.liked_by_me);
  const [likes, setLikes]           = useState(post.likes_count);
  const [inbox, setInbox]           = useState(null);
  const [showInbox, setShowInbox]   = useState(false);
  const [loadingCmts, setLoadingCmts] = useState(false);

  const isMyPost = post.author.id === user?.id;

  // Load comments
  const loadComments = useCallback(async () => {
    if (comments !== null) return; // already loaded
    setLoadingCmts(true);
    try {
      const { comments: list } = await api.getComments(post.id);
      setComments(list);
    } catch {}
    setLoadingCmts(false);
  }, [comments, post.id]);

  const toggleComments = () => {
    setShowComments(s => !s);
    if (!showComments && comments === null) loadComments();
  };

  // Like post
  const handleLike = async () => {
    setLiked(!liked);
    setLikes(n => liked ? n - 1 : n + 1);
    try { await api.likePost(post.id); } catch {}
  };

  // Submit comment
  const handleComment = useCallback(async (postId, text) => {
    const { comment } = await api.postComment(postId, text);
    setComments(prev => [...(prev || []), comment]);
  }, []);

  // Like comment
  const handleLikeComment = async (commentId, idx) => {
    try {
      const { liked: nowLiked, likes_count } = await api.likeComment(commentId);
      setComments(prev => prev.map((c, i) =>
        i === idx ? { ...c, liked_by_me: nowLiked, likes_count } : c
      ));
    } catch {}
  };

  // Owner inbox
  const loadInbox = async () => {
    try {
      const { inbox: data } = await api.getInbox(post.id);
      setInbox(data);
      setShowInbox(true);
    } catch {}
  };

  return (
    <article className={`post anim-up ${isMyPost ? 'post--mine' : ''}`}>
      {/* ── Header ── */}
      <div className="post__header">
        <Avatar name={post.author.name} color={post.author.avatar_color} size={44} />
        <div className="post__meta">
          <div className="post__name">
            {post.author.name}
            {isMyPost && <span className="pill pill-amber">You</span>}
          </div>
          {post.author.headline && (
            <div className="post__headline">{post.author.headline}</div>
          )}
          <div className="post__time">
            {timeAgo(post.created_at)}
            {post.tag && <> · <b>{post.tag}</b></>}
          </div>
        </div>
        {isMyPost && (
          <button
            onClick={() => onDelete(post.id)}
            style={{ background:'transparent', border:'none', color:'var(--text-3)',
              fontSize:'1rem', padding:'4px 8px', borderRadius:'6px',
              cursor:'pointer', transition:'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color='var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-3)'}
            title="Delete post"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="post__body">{post.content}</div>

      {/* ── Actions ── */}
      <div className="post__actions">
        <button
          className={`post__action ${liked ? 'post__action--liked' : ''}`}
          onClick={handleLike}
        >
          ♥ {likes || 0}
        </button>
        <button
          className={`post__action ${showComments ? 'post__action--active' : ''}`}
          onClick={toggleComments}
        >
          ◎ {comments ? comments.length : (post.comments_count || 0)}
        </button>
        {isMyPost && (
          <button
            className="post__action"
            onClick={loadInbox}
            style={{ marginLeft: 'auto', color: 'var(--amber)', opacity: 0.8 }}
          >
            ◆ Inbox
          </button>
        )}
      </div>

      {/* ── Owner inbox ── */}
      {showInbox && inbox !== null && (
        <div style={{ padding: '0 14px 14px' }}>
          <div className="inbox">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 3 }}>
              <div className="inbox__title">◆ Your Private Inbox</div>
              <button onClick={() => setShowInbox(false)}
                style={{ background:'transparent', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:'0.8rem' }}>
                close ×
              </button>
            </div>
            <div className="inbox__sub">
              Only you can see this. These are the contact details people submitted on your post.
            </div>
            {inbox.length === 0 ? (
              <div style={{ fontSize:'0.73rem', color:'var(--text-3)', fontStyle:'italic' }}>
                No contact info submitted yet.
              </div>
            ) : inbox.map((r, i) => (
              <div className="inbox__row" key={i}>
                <Avatar name={r.author_name} color={r.avatar_color} size={30} />
                <div className="inbox__info">
                  <div className="inbox__name">{r.author_name}</div>
                  <div className="inbox__meta">{r.author_headline || ''}</div>
                </div>
                <div className="inbox__pill">{r.pii_type}: {r.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Comments ── */}
      {showComments && (
        <div className="comments">
          <div className="comments__header">
            <span>{comments ? comments.length : '…'} comment{comments?.length !== 1 ? 's' : ''}</span>
            {isMyPost
              ? <em>◆ You see all emails here</em>
              : <em>Only your own contact info is visible to you</em>}
          </div>

          {loadingCmts ? (
            <div style={{ display:'flex', gap:8, alignItems:'center', padding:'12px 0', color:'var(--text-3)', fontSize:'0.76rem' }}>
              <div className="spinner" style={{ width:14, height:14, borderWidth:1.5 }} />
              Loading…
            </div>
          ) : comments?.length === 0 ? (
            <p className="empty" style={{ padding:'16px 0' }}>No comments yet.</p>
          ) : (
            <div>
              {comments?.map((c, idx) => {
                const cls = ['comment',
                  c.visibility === 'self'  ? 'comment--self'  : '',
                  c.visibility === 'owner' ? 'comment--owner' : '',
                ].filter(Boolean).join(' ');

                let noteText = '';
                let noteCls  = 'comment__note';
                if (c.has_pii) {
                  if (c.visibility === 'masked') { noteText = `🔒 ${c.pii_count} item${c.pii_count>1?'s':''} hidden`; noteCls += ' comment__note--masked'; }
                  else if (c.visibility === 'self') { noteText = `◉ your info — visible to you`; noteCls += ' comment__note--self'; }
                  else { noteText = `◆ visible — you own this post`; noteCls += ' comment__note--owner'; }
                } else {
                  noteText = '✓ no contact info'; noteCls += ' comment__note--clean';
                }

                return (
                  <div className={cls} key={c.id}>
                    <Avatar name={c.author.name} color={c.author.avatar_color} size={32} />
                    <div className="comment__bubble">
                      <div className="comment__top">
                        <span className="comment__name">{c.author.name}</span>
                        {c.author.headline && <span className="comment__role">{c.author.headline}</span>}
                        {c.visibility === 'self'  && <span className="pill pill-blue" style={{ fontSize:'0.58rem' }}>You</span>}
                        {c.visibility === 'owner' && c.has_pii && <span className="pill pill-amber" style={{ fontSize:'0.58rem' }}>Owner</span>}
                        <span className="comment__time">{timeAgo(c.created_at)}</span>
                      </div>

                      <div className="comment__text">
                        <CommentText text={c.text} visibility={c.visibility} hasPii={c.has_pii} />
                      </div>

                      <div className="comment__footer">
                        <span className={noteCls}>{noteText}</span>
                        <button
                          className={`comment__like ${c.liked_by_me ? 'comment__like--active' : ''}`}
                          onClick={() => handleLikeComment(c.id, idx)}
                        >
                          ♥ {c.likes_count || ''}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <CommentBox postId={post.id} onSubmit={handleComment} />
        </div>
      )}
    </article>
  );
}
