import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocuments } from '../hooks/useDocuments.js';
import { useConversations } from '../context/ConversationsContext.jsx';
import StatusBadge from '../components/documents/StatusBadge.jsx';
import { timeAgo } from '../utils.js';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { documents, loading } = useDocuments();
  const { conversations } = useConversations();
  const ready = documents.filter((d) => d.processingStatus === 'ready').length;

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="muted">
            {loading ? 'Loading your library…'
              : documents.length === 0 ? 'Upload your first document to start asking questions.'
              : `${ready} of ${documents.length} documents ready · ${conversations.length} conversations`}
          </p>
        </div>
        <div className="row-gap">
          <Link className="btn" to="/documents/upload">Upload</Link>
          <button className="btn btn-primary" onClick={() => navigate('/chat')}>New chat</button>
        </div>
      </header>

      <div className="two-col">
        <section>
          <div className="section-head"><h2>Recent documents</h2><Link to="/documents">View all</Link></div>
          {!documents.length ? (
            <p className="empty">No documents yet. <Link to="/documents/upload">Upload a PDF or Word file.</Link></p>
          ) : (
            <ul className="plain-list">
              {documents.slice(0, 5).map((d) => (
                <li key={d._id}>
                  <span className="truncate">{d.originalName}</span>
                  <StatusBadge status={d.processingStatus} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <div className="section-head"><h2>Recent conversations</h2></div>
          {!conversations.length ? (
            <p className="empty">No conversations yet. <Link to="/chat">Ask a question.</Link></p>
          ) : (
            <ul className="plain-list">
              {conversations.slice(0, 5).map((c) => (
                <li key={c._id}>
                  <Link className="truncate" to={`/chat/${c._id}`}>{c.title}</Link>
                  <small className="muted">{timeAgo(c.lastMessageAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
