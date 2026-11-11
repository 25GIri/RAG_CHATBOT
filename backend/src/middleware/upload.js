import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const EXT_TO_TYPE = { '.pdf': 'pdf', '.doc': 'doc', '.docx': 'docx' };
const MIME_OK = new Set([
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = path.join(env.storageRoot, String(req.user._id));
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename(req, file, cb) {
    // Never trust the client filename for the on-disk path: use a random UUID.
    const type = EXT_TO_TYPE[path.extname(file.originalname).toLowerCase()];
    const name = `${crypto.randomUUID()}.${type}`;
    file.fileType = type;
    file.relativePath = `${req.user._id}/${name}`;
    cb(null, name);
  },
});

const uploader = multer({
  storage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024, files: env.maxFilesPerUpload },
  fileFilter(_req, file, cb) {
    const type = EXT_TO_TYPE[path.extname(file.originalname).toLowerCase()];
    if (!type || !MIME_OK.has(file.mimetype)) {
      return cb(ApiError.badRequest('Only PDF, DOC and DOCX files are allowed'));
    }
    cb(null, true);
  },
});

export const uploadFiles = uploader.array('files', env.maxFilesPerUpload);
