import { useCallback, useEffect, useRef, useState } from 'react';
import * as docsApi from '../api/documents.api.js';
import { errorMessage } from '../api/axios.js';
import { isBusy } from '../utils.js';

/** Loads documents and polls every 3s while any are still being processed. */
export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const docs = await docsApi.listDocuments();
      setDocuments(docs);
      setError('');
      return docs;
    } catch (err) {
      setError(errorMessage(err));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (documents.some(isBusy)) timer.current = setTimeout(refresh, 3000);
    return () => clearTimeout(timer.current);
  }, [documents, refresh]);

  const remove = useCallback(async (id) => {
    await docsApi.deleteDocument(id);
    setDocuments((d) => d.filter((x) => x._id !== id));
  }, []);

  return { documents, loading, error, refresh, remove };
}
