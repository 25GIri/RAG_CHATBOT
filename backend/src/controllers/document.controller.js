import * as documents from '../services/documentService.js';
import { ApiError } from '../utils/ApiError.js';

export async function upload(req, res) {
  if (!req.files?.length) throw ApiError.badRequest('Attach at least one file in the "files" field');
  const docs = await documents.createFromUploads(req.user._id, req.files, req.body);
  res.status(202).json({ documents: docs });
}
export async function list(req, res) {
  res.json({ documents: await documents.list(req.user._id) });
}
export async function get(req, res) {
  res.json({ document: await documents.getOwned(req.user._id, req.params.id) });
}
export async function remove(req, res) {
  await documents.remove(req.user._id, req.params.id);
  res.json({ ok: true });
}
