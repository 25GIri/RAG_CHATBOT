import { useEffect, useState } from 'react';

export default function SourceCitations({ sources, active }) {
  const [open, setOpen] = useState(null);
  useEffect(() => { if (active) setOpen(active); }, [active]);
  if (!sources?.length) return null;

  return (
    <div className="sources">
      <p className="sources-title">Sources</p>
      <ol className="source-list">
        {sources.map((s) => {
          const isOpen = open === s.index;
          const where = [s.pageNumber ? `p. ${s.pageNumber}` : null, s.sectionHeading].filter(Boolean).join(', ');
          return (
            <li key={s.index} className={`source ${isOpen ? 'is-open' : ''} ${active === s.index ? 'is-active' : ''}`}>
              <button className="source-head" onClick={() => setOpen(isOpen ? null : s.index)} aria-expanded={isOpen}>
                <span className="cite-num">{s.index}</span>
                <span className="source-name">{s.documentName}</span>
                {where && <span className="source-where">{where}</span>}
              </button>
              {isOpen && <p className="source-snippet">“{s.snippet}{s.snippet.length >= 260 ? '…' : ''}”</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
