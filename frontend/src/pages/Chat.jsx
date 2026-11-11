import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as chatApi from '../api/chat.api.js';
import { errorMessage } from '../api/axios.js';
import { useDocuments } from '../hooks/useDocuments.js';
import { useConversations } from '../context/ConversationsContext.jsx';
import DocumentPicker from '../components/chat/DocumentPicker.jsx';
import MessageBubble from '../components/chat/MessageBubble.jsx';
import MessageInput from '../components/chat/MessageInput.jsx';
import WelcomeScreen from '../components/chat/WelcomeScreen.jsx';

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { documents } = useDocuments();
  const { upsert } = useConversations();

  const [title, setTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(location.state?.docIds || []);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');

  const currentId = useRef(id);      // conversation currently on screen
  const streamingFor = useRef(null); // conversation an active stream belongs to
  const skipLoad = useRef(null);     // id we just created: don't refetch it
  const abortRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    currentId.current = id;
    if (streamingFor.current && streamingFor.current !== id) abortRef.current?.abort();
    setError('');

    if (!id) {
      setMessages([]); setTitle('');
      setSelected(location.state?.docIds || []);
      return undefined;
    }
    if (skipLoad.current === id) { skipLoad.current = null; return undefined; }

    let cancelled = false;
    setLoading(true);
    chatApi.getMessages(id)
      .then(({ conversation, messages: rows }) => {
        if (cancelled) return;
        setMessages(rows);
        setTitle(conversation.title);
        setSelected((conversation.selectedDocuments || []).map(String));
      })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  const changeSelection = async (ids) => {
    setSelected(ids);
    if (!id) return;
    try { await chatApi.updateConversation(id, { selectedDocuments: ids }); }
    catch (err) { setError(errorMessage(err)); }
  };

  const send = async (text) => {
    setError('');
    let convId = id;
    if (!convId) {
      try {
        const conv = await chatApi.createConversation({ selectedDocuments: selected });
        convId = conv._id;
        skipLoad.current = convId;
        currentId.current = convId;
        upsert(conv);
        navigate(`/chat/${convId}`, { replace: true });
      } catch (err) { setError(errorMessage(err)); return; }
    }

    const stamp = Date.now();
    const userTemp = { _id: `tmp-${stamp}`, role: 'user', content: text };
    const draftId = `draft-${stamp}`;
    setMessages((m) => [...m, userTemp, { _id: draftId, role: 'assistant', content: '', streaming: true, sources: [] }]);
    setStreaming(true);
    streamingFor.current = convId;
    const controller = new AbortController();
    abortRef.current = controller;
    const live = () => currentId.current === convId;

    try {
      await chatApi.streamMessage(convId, text, {
        signal: controller.signal,
        onToken: (t) => live() && setMessages((m) => m.map((x) => (x._id === draftId ? { ...x, content: x.content + t } : x))),
        onDone: ({ userMessage, assistantMessage, conversation }) => {
          upsert(conversation);
          if (!live()) return;
          setTitle(conversation.title);
          setMessages((m) => m.filter((x) => x._id !== userTemp._id && x._id !== draftId).concat([userMessage, assistantMessage]));
        },
      });
    } catch (err) {
      if (live()) {
        if (err.name === 'AbortError') {
          setMessages((m) => m.map((x) => (x._id === draftId ? { ...x, streaming: false } : x)).filter((x) => x.content || x.role === 'user'));
        } else {
          setError(err.message || 'Could not get an answer.');
          setMessages((m) => m.filter((x) => x._id !== draftId));
        }
      }
    } finally {
      if (streamingFor.current === convId) { streamingFor.current = null; setStreaming(false); }
    }
  };

  const showWelcome = !loading && !messages.length;

  return (
    <div className="chat">
      <header className="chat-head">
        <h2 className="truncate">{title || 'New chat'}</h2>
        <DocumentPicker documents={documents} value={selected} onChange={changeSelection} disabled={streaming} />
      </header>

      <div className="chat-scroll" role="log" aria-live="polite">
        <div className="chat-col">
          {loading && <p className="muted center">Loading conversation…</p>}
          {showWelcome && (
            <WelcomeScreen readyCount={documents.filter((d) => d.processingStatus === 'ready').length} onPrompt={send} />
          )}
          {messages.map((m) => <MessageBubble key={m._id} message={m} />)}
          {error && <div className="alert" role="alert">{error}</div>}
          <div ref={endRef} />
        </div>
      </div>

      <div className="chat-foot">
        <div className="chat-col">
          <MessageInput
            onSend={send}
            onStop={() => abortRef.current?.abort()}
            streaming={streaming}
            disabled={loading}
            placeholder={selected.length ? 'Ask about the selected documents…' : 'Ask about any of your documents…'}
          />
          <p className="fineprint">Answers are generated from your documents and can still contain mistakes. Check the sources.</p>
        </div>
      </div>
    </div>
  );
}
