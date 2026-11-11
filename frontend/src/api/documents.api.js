import { api } from './axios.js';

export const listDocuments = () => api.get('/documents').then((r) => r.data.documents);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);
export function uploadDocuments(files, options, onProgress) {
  const form = new FormData();
  Object.entries(options || {}).forEach(([k, v]) => v !== undefined && v !== '' && form.append(k, v));
  files.forEach((f) => form.append('files', f));
  return api
    .post('/documents/upload', form, {
      onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
    })
    .then((r) => r.data.documents);
}
