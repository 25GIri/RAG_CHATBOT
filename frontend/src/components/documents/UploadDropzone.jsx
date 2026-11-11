import { useRef, useState } from 'react';

export default function UploadDropzone({ onFiles, disabled }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);

  const pick = (list) => list?.length && onFiles(Array.from(list));

  return (
    <div
      className={`dropzone ${over ? 'is-over' : ''} ${disabled ? 'is-disabled' : ''}`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) pick(e.dataTransfer.files); }}
    >
      <p className="dropzone-title">Drop PDF or Word files here</p>
      <p className="muted">or</p>
      <button type="button" className="btn" disabled={disabled} onClick={() => input.current?.click()}>
        Choose files
      </button>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => { pick(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
