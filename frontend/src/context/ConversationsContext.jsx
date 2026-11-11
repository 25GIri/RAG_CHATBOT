import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as chatApi from '../api/chat.api.js';

const Ctx = createContext(null);
export const useConversations = () => useContext(Ctx);

export function ConversationsProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chatApi.listConversations().then(setConversations).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const upsert = useCallback((conv) => {
    setConversations((list) => {
      const rest = list.filter((c) => c._id !== conv._id);
      return [conv, ...rest].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    });
  }, []);

  const remove = useCallback(async (id) => {
    await chatApi.deleteConversation(id);
    setConversations((list) => list.filter((c) => c._id !== id));
  }, []);

  const value = useMemo(() => ({ conversations, loading, upsert, remove }), [conversations, loading, upsert, remove]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
