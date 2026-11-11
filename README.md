# Marginalia: RAG document assistant

Upload PDF/DOC/DOCX files, then chat with them. Answers are grounded in your documents, cite the page and section, and say so when the answer isn't there.

Stack: React + Vite, Express, MongoDB Atlas (Vector Search), Gemini (`@google/genai`).

## Built in 2 phases

**Phase 1: Backend** (`backend/`): auth (JWT in HTTP-only cookie), uploads with signature checks, PDF/DOCX/DOC parsing, four chunking strategies, Gemini embeddings, Atlas vector search, RAG pipeline with streaming, conversation memory, security, background queue, unit tests.

**Phase 2: Frontend and delivery** (`frontend/`, Docker): login/register, dashboard, document library with live processing status, upload with chunking options, ChatGPT-style chat with streaming, citation chips, document picker, settings, Dockerfiles and compose.

## Run it locally

1. **Atlas**: create a cluster (M0 works) and a database user. Copy the connection string.
2. **Backend**
   ```bash
   cd backend
   cp .env.example .env      # fill MONGODB_URI, JWT_SECRET, GEMINI_API_KEY, GEMINI_MODEL
   npm install
   npm run create-index      # creates the Atlas vector index (once)
   npm run dev
   ```
   `GEMINI_MODEL` must be a model ID supported by the Generative Language API, such as `gemini-2.5-flash`.
3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev               # http://localhost:5173 (proxies /api to :5000)
   ```
4. Register, upload a document, wait for **Ready**, then ask a question.

Docker: fill `backend/.env`, then `docker compose up --build` and open http://localhost:8080.

## How it works

**Ingestion** (`queue/processDocumentJob.js`): upload is validated (extension, MIME, size, magic bytes) and stored at `storage/<userId>/<uuid>.<ext>` → queued → parsed with page numbers and headings → cleaned → chunked (default: structure-aware, 800 tokens, 120 overlap) → embedded (`gemini-embedding-001`, 768 dims, normalized) → stored → status `ready`. Status and progress are persisted, and unfinished jobs are re-queued on restart.

**Chunking** (`services/chunkingService.js`): `fixed`, `recursive`, `semantic` (embedding-distance breakpoints) and `structure` (section-aware, recursive split for oversized sections). Strategy, size and overlap are set globally in `.env` and can be overridden per upload.

**Question answering** (`services/ragService.js`): condense follow-up into a standalone query → embed → `$vectorSearch` pre-filtered by `user` and selected documents → similarity threshold → MMR rerank → context token budget → grounded prompt → streamed answer → citations saved with the message. If nothing clears the threshold, the assistant replies that it couldn't find the answer, without calling the model.

**Memory**: only the last `RAG_HISTORY_WINDOW` messages of the same conversation are used. New chats start empty.

## API

| | |
|---|---|
| `POST /api/auth/register` `login` `logout` · `GET /api/auth/me` | auth |
| `PATCH /api/auth/me` · `PATCH /api/auth/password` | settings |
| `POST /api/documents/upload` (multipart `files`, optional `strategy`, `chunkSize`, `chunkOverlap`) | returns 202 |
| `GET /api/documents` · `GET/DELETE /api/documents/:id` | |
| `POST/GET /api/chat/conversations` · `PATCH/DELETE /api/chat/conversations/:id` | |
| `GET/POST /api/chat/conversations/:id/messages` | POST streams SSE (`start`, `token`, `done`, `error`) |

## Security

HTTP-only `SameSite=Lax` cookie · bcrypt (12 rounds) · every query scoped by `user` · vector pre-filter on `user` · random storage names and path-traversal guard · magic-byte file checks · helmet, CORS allow-list, rate limits (global, auth, upload, chat) · API key server-side only · document text is wrapped in `<document_context>` and the prompt tells the model to treat it as untrusted data · deleting a document removes its file, chunks/embeddings and conversation references.

## Tests

```bash
cd backend && npm test
```
Covers chunking (all strategies, headings, pages, overlap, size limits), heading detection, path traversal, text cleaning, MMR and context budgeting.

## Known limits

- Scanned PDFs have no text layer and are rejected with a clear message (no OCR).
- DOCX/DOC have no fixed pages, so citations show the section heading instead of a page number.
- The Atlas vector index must be created with `npm run create-index` before asking questions. Atlas indexes new vectors within a few seconds, so a question asked the instant a document turns Ready can briefly miss it.
- The queue is in-process, and rate limits are in-memory. For multiple server instances, swap in BullMQ/Redis and a shared limiter store.
- Tune `RAG_MIN_SCORE` for your content. Atlas cosine scores are `(1+cos)/2`, so 0.65 is cosine 0.3.
# RAG_CHATBOT
