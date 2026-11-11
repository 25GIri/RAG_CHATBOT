import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadDropzone from '../components/documents/UploadDropzone.jsx';
import { uploadDocuments } from '../api/documents.api.js';
import { getConfig } from '../api/auth.api.js';
import { errorMessage } from '../api/axios.js';
import { formatBytes } from '../utils.js';

const STRATEGY_HELP = {
  structure: 'Follows headings and paragraphs. Best for most documents.',
  recursive: 'Splits on paragraphs, then sentences, then words.',
  semantic: 'Splits where the topic changes. Slower and uses more AI calls.',
  fixed: 'Cuts at a fixed length. Fast but can break mid-sentence.',
};

export default function DocumentUpload() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [files, setFiles] = useState([]);
  const [opts, setOpts] = useState({ strategy: '', chunkSize: '', chunkOverlap: '' });
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { getConfig().then(setConfig).catch(() => {}); }, []);

  const maxMb = config?.upload.maxFileSizeMb ?? 20;
  const maxFiles = config?.upload.maxFiles ?? 5;

  const add = (incoming) => {
    const problems = [];
    const accepted = incoming.filter((f) => {
      if (!/\.(pdf|docx?)$/i.test(f.name)) { problems.push(`${f.name}: only PDF, DOC and DOCX are supported`); return false; }
      if (f.size > maxMb * 1024 * 1024) { problems.push(`${f.name}: larger than ${maxMb} MB`); return false; }
      return true;
    });
    const next = [...files, ...accepted].slice(0, maxFiles);
    if (files.length + accepted.length > maxFiles) problems.push(`You can upload up to ${maxFiles} files at a time`);
    setFiles(next);
    setError(problems.join('. '));
  };

  const submit = async () => {
    setError(''); setProgress(0);
    try {
      await uploadDocuments(files, opts, setProgress);
      navigate('/documents');
    } catch (err) {
      setError(errorMessage(err));
      setProgress(null);
    }
  };

  const strategy = opts.strategy || config?.chunking.strategy || 'structure';
  const uploading = progress !== null;

  return (
    <main className="page page-narrow">
      <header className="page-head">
        <div>
          <h1>Upload documents</h1>
          <p className="muted">Files are processed in the background. You can leave this page once they are uploaded.</p>
        </div>
      </header>

      <UploadDropzone onFiles={add} disabled={uploading} />
      {error && <div className="alert" role="alert">{error}</div>}

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <span className="truncate">{f.name}</span>
              <small className="muted">{formatBytes(f.size)}</small>
              <button className="btn btn-quiet btn-small" disabled={uploading} onClick={() => setFiles(files.filter((_, j) => j !== i))}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      <details className="advanced">
        <summary>Chunking options</summary>
        <div className="grid-3">
          <label>Strategy
            <select value={opts.strategy} onChange={(e) => setOpts({ ...opts, strategy: e.target.value })}>
              <option value="">Default ({config?.chunking.strategy || 'structure'})</option>
              {(config?.chunking.strategies || ['structure', 'recursive', 'semantic', 'fixed']).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Chunk size (tokens)
            <input type="number" min={config?.chunking.minSize || 100} max={config?.chunking.maxSize || 2000} placeholder={config?.chunking.size || 800} value={opts.chunkSize} onChange={(e) => setOpts({ ...opts, chunkSize: e.target.value })} />
          </label>
          <label>Overlap (tokens)
            <input type="number" min={0} placeholder={config?.chunking.overlap ?? 120} value={opts.chunkOverlap} onChange={(e) => setOpts({ ...opts, chunkOverlap: e.target.value })} />
          </label>
        </div>
        <p className="muted">{STRATEGY_HELP[strategy]}</p>
      </details>

      <div className="row-gap">
        <button className="btn btn-primary" disabled={!files.length || uploading} onClick={submit}>
          {uploading ? `Uploading… ${progress}%` : `Upload ${files.length || ''} ${files.length === 1 ? 'file' : 'files'}`.trim()}
        </button>
        <button className="btn" disabled={uploading} onClick={() => navigate('/documents')}>Cancel</button>
      </div>
    </main>
  );
}
