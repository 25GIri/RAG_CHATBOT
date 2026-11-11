import StatusBadge from './StatusBadge.jsx';
import { formatBytes, isBusy, timeAgo } from '../../utils.js';

export default function DocumentCard({ doc, selected, onToggle, onDelete, onChat }) {
  const ready = doc.processingStatus === 'ready';
  const meta = [
    doc.fileType.toUpperCase(),
    formatBytes(doc.fileSize),
    doc.metadata?.pageCount ? `${doc.metadata.pageCount} pages` : null,
    ready ? `${doc.totalChunks} passages` : null,
    timeAgo(doc.createdAt),
  ].filter(Boolean).join('  ·  ');

  return (
    <li className={`doc-row ${selected ? 'is-selected' : ''}`}>
      <input
        type="checkbox"
        className="doc-check"
        checked={selected}
        disabled={!ready}
        onChange={() => onToggle(doc._id)}
        aria-label={`Select ${doc.originalName}`}
      />
      <div className="doc-main">
        <p className="doc-name" title={doc.originalName}>{doc.originalName}</p>
        <p className="doc-meta">{meta}</p>
        {isBusy(doc) && (
          <div className="progress" role="progressbar" aria-valuenow={doc.processingProgress || 0} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${doc.processingProgress || 5}%` }} />
          </div>
        )}
        {doc.processingStatus === 'failed' && <p className="doc-error">{doc.processingError || 'Processing failed.'}</p>}
      </div>
      <StatusBadge status={doc.processingStatus} />
      <div className="doc-actions">
        <button className="btn btn-quiet" disabled={!ready} onClick={() => onChat(doc._id)}>Ask</button>
        <button className="btn btn-quiet btn-danger-text" onClick={() => onDelete(doc)}>Delete</button>
      </div>
    </li>
  );
}
