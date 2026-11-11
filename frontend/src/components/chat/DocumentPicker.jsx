import { useEffect, useRef, useState } from 'react';
import { isBusy } from '../../utils.js';

export default function DocumentPicker({ documents, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const ready = documents.filter((d) => d.processingStatus === 'ready');
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const label = !value.length ? 'All documents' : value.length === 1
    ? documents.find((d) => d._id === value[0])?.originalName || '1 document'
    : `${value.length} documents`;

  return (
    <div className="picker" ref={box}>
      <button className="btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox" disabled={disabled}>
        <span className="picker-label">{label}</span>
      </button>
      {open && (
        <div className="picker-pop" role="listbox" aria-multiselectable="true">
          <div className="picker-head">
            <span>Answer from</span>
            <button className="btn btn-quiet btn-small" onClick={() => onChange([])}>Use all</button>
          </div>
          {!documents.length && <p className="picker-empty">No documents yet. Upload one from the Documents page.</p>}
          <ul>
            {documents.map((d) => {
              const isReady = d.processingStatus === 'ready';
              return (
                <li key={d._id}>
                  <label className={isReady ? '' : 'is-disabled'}>
                    <input type="checkbox" checked={value.includes(d._id)} disabled={!isReady} onChange={() => toggle(d._id)} />
                    <span className="picker-name">{d.originalName}</span>
                    {!isReady && <small>{isBusy(d) ? 'Processing' : 'Failed'}</small>}
                  </label>
                </li>
              );
            })}
          </ul>
          {ready.length > 0 && !value.length && <p className="picker-note">Nothing selected means every ready document is searched.</p>}
        </div>
      )}
    </div>
  );
}
