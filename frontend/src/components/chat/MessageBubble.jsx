import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import CopyButton from './CopyButton.jsx';
import SourceCitations from './SourceCitations.jsx';

export default function MessageBubble({ message }) {
  const [active, setActive] = useState(null);

  // Turn [1] markers into links so they can render as clickable chips.
  const markdown = useMemo(() => message.content.replace(/\[(\d+)\]/g, '[$1](#cite-$1)'), [message.content]);

  if (message.role === 'user') {
    return (
      <div className="msg msg-user">
        <div className="bubble-user">{message.content}</div>
      </div>
    );
  }

  const components = {
    a: ({ href, children }) =>
      href?.startsWith('#cite-') ? (
        <button className="cite-chip" onClick={() => setActive(Number(href.slice(6)))} aria-label={`Show source ${children}`}>
          {children}
        </button>
      ) : (
        <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
      ),
  };

  return (
    <div className={`msg msg-ai ${message.messageType === 'not_found' ? 'is-notfound' : ''}`}>
      <div className="ai-text">
        {message.streaming && !message.content && <p className="thinking">Searching your documents</p>}
        <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
        {message.streaming && <span className="caret" aria-hidden="true" />}
      </div>
      {!message.streaming && (
        <>
          <SourceCitations sources={message.sources} active={active} />
          <div className="msg-tools"><CopyButton text={message.content} /></div>
        </>
      )}
    </div>
  );
}
