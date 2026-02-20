// In production: frontend is served by the same Express server, so /api works.
// In development: package.json proxy forwards /api to localhost:4000.
const BASE = '/api';

function token() {
  return localStorage.getItem('pn_token');
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register:    (name, email, password, headline) => req('POST', '/auth/register', { name, email, password, headline }),
  login:       (email, password)                 => req('POST', '/auth/login', { email, password }),
  getUser:     (id)                              => req('GET',  `/users/${id}`),
  updateMe:    (data)                            => req('PATCH','/users/me', data),
  getPosts:    ()                                => req('GET',  '/posts'),
  createPost:  (content, tag)                    => req('POST', '/posts', { content, tag }),
  likePost:    (id)                              => req('POST', `/posts/${id}/like`),
  deletePost:  (id)                              => req('DELETE',`/posts/${id}`),
  getComments: (postId)                          => req('GET',  `/comments/${postId}`),
  postComment: (postId, text)                    => req('POST', '/comments', { postId, text }),
  likeComment: (id)                              => req('POST', `/comments/${id}/like`),
  getInbox:    (postId)                          => req('GET',  `/comments/${postId}/inbox`),
};
