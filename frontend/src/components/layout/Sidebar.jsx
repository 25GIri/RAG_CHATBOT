import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConversations } from '../../context/ConversationsContext.jsx';

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const { conversations, loading, remove } = useConversations();
  const navigate = useNavigate();
  const { id: activeId } = useParams();

  const go = (to) => { navigate(to); onClose?.(); };

  const onDelete = async (e, conv) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${conv.title}"? This cannot be undone.`)) return;
    await remove(conv._id);
    if (conv._id === activeId) navigate('/chat');
  };

  return (
    <>
      {open && <div className="scrim" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Primary">
        <div className="brand">Marginalia</div>
        <button className="btn btn-primary btn-block" onClick={() => go('/chat')}>New chat</button>

        <nav className="side-nav">
          <NavLink to="/" end onClick={onClose}>Overview</NavLink>
          <NavLink to="/documents" onClick={onClose}>Documents</NavLink>
        </nav>

        <div className="side-section">Recent conversations</div>
        <ul className="convo-list">
          {loading && <li className="side-empty">Loading…</li>}
          {!loading && !conversations.length && <li className="side-empty">No conversations yet.</li>}
          {conversations.map((c) => (
            <li key={c._id}>
              <div
                role="link"
                tabIndex={0}
                className={`convo ${c._id === activeId ? 'is-active' : ''}`}
                onClick={() => go(`/chat/${c._id}`)}
                onKeyDown={(e) => e.key === 'Enter' && go(`/chat/${c._id}`)}
              >
                <span className="convo-title">{c.title}</span>
                <button className="convo-delete" aria-label={`Delete ${c.title}`} onClick={(e) => onDelete(e, c)}>×</button>
              </div>
            </li>
          ))}
        </ul>

        <div className="side-footer">
          <NavLink to="/settings" onClick={onClose} className="side-user">
            <span className="avatar" aria-hidden="true">{user?.name?.[0]?.toUpperCase()}</span>
            <span className="side-user-text">
              <strong>{user?.name}</strong>
              <small>Settings</small>
            </span>
          </NavLink>
          <button className="btn btn-quiet-dark" onClick={logout}>Log out</button>
        </div>
      </aside>
    </>
  );
}
