import PiiChip from './PiiChip';

// Parses tokenized text like "Hi, email me at [email hidden]"
// or resolved text with visibility data from the server
export default function CommentText({ text, visibility, hasPii }) {
  if (!hasPii) return <span>{text}</span>;

  // Text coming from server already has tokens replaced with readable form:
  // masked → "[email hidden]"   self/owner → real value
  // We parse the brackets to style them as chips
  const TOKEN_RE = /\[([a-z]+) hidden\]/g;

  if (visibility === 'masked') {
    const parts = [];
    let last = 0, m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      if (m.index > last) parts.push(<span key={last}>{text.slice(last, m.index)}</span>);
      parts.push(<PiiChip key={m.index} content={m[0]} visibility="masked" piiType={m[1]} />);
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(<span key="end">{text.slice(last)}</span>);
    return <>{parts}</>;
  }

  // self or owner — server already resolved to real values, just wrap them
  // We can't know exact positions anymore, but we can style the whole text
  // with the visibility indicator on the comment bubble itself
  return <span>{text}</span>;
}
