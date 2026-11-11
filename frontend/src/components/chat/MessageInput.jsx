import { useEffect, useRef, useState } from 'react';

export default function MessageInput({ onSend, onStop, streaming, disabled, placeholder }) {
  const [value, setValue] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || streaming || disabled) return;
    onSend(text);
    setValue('');
  };

  return (
    <div className="composer">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        maxLength={4000}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Message"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
        }}
      />
      {streaming ? (
        <button className="btn" onClick={onStop}>Stop</button>
      ) : (
        <button className="btn btn-primary" onClick={submit} disabled={!value.trim() || disabled}>Send</button>
      )}
    </div>
  );
}
