import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDocuments } from '../hooks/useDocuments.js';
import DocumentCard from '../components/documents/DocumentCard.jsx';
import { errorMessage } from '../api/axios.js';

export default function DocumentLibrary() {
  const navigate = useNavigate();
  const { documents, loading, error, remove } = useDocuments();
  const [selected, setSelected] = useState([]);
  const [actionError, setActionError] = useState('');

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const chat = (ids) => navigate('/chat', { state: { docIds: ids } });

  const onDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.originalName}"? Its file and search data will be removed.`)) return;
    try {
      await remove(doc._id);
      setSelected((s) => s.filter((x) => x !== doc._id));
    } catch (err) { setActionError(errorMessage(err)); }
  };

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Documents</h1>
          <p className="muted">PDF, DOC and DOCX files you have uploaded.</p>
        </div>
        <div className="row-gap">
          {selected.length > 0 && <button className="btn btn-primary" onClick={() => chat(selected)}>Ask {selected.length} selected</button>}
          <Link className="btn" to="/documents/upload">Upload</Link>
        </div>
      </header>

      {(error || actionError) && <div className="alert" role="alert">{error || actionError}</div>}
      {loading ? <p className="muted">Loading…</p> : !documents.length ? (
        <p className="empty">Nothing here yet. <Link to="/documents/upload">Upload your first document.</Link></p>
      ) : (
        <ul className="doc-list">
          {documents.map((d) => (
            <DocumentCard
              key={d._id}
              doc={d}
              selected={selected.includes(d._id)}
              onToggle={toggle}
              onDelete={onDelete}
              onChat={(id) => chat([id])}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
