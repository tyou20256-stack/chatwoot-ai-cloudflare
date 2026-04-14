// Files handler with optional R2 upload.
// If env.FILES_R2 binding is configured, bytes are uploaded to R2 and the
// R2 object key is persisted in `files.r2_key`. Otherwise degrades to a
// metadata-only stub (r2_key = 'stub://not-implemented') so free-tier /
// initial deploys keep working until a bucket is provisioned.

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

// MIME allowlist for uploads & downloads
const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain',
  'application/json',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',  // Fallback for unknown; treat as attachment-only
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// TODO: When multi-tenant staff enforcement is in place, derive tenant_id from
// auth.principal (staff_members.tenant_id set at session issue) instead of query param.
function getTenantId(request) {
  return new URL(request.url).searchParams.get('tenant_id') || 'tenant_default';
}

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}

function hasR2(env) {
  return env && env.FILES_R2 && typeof env.FILES_R2.put === 'function';
}

// Lightweight UUID v4 (no external dep). Uses crypto.randomUUID if available.
function uuidv4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 fallback
  const bytes = new Uint8Array(16);
  (typeof crypto !== 'undefined' ? crypto : { getRandomValues: (a) => a })
    .getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function handleFilesGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversation_id');
    const tenantId = getTenantId(request);
    let sql = `SELECT
        id, conversation_id,
        filename AS original_filename,
        mime_type AS file_type,
        size AS file_size,
        r2_key AS storage_url,
        uploaded_by,
        NULL AS conversation_title,
        'staff' AS uploaded_by_type,
        created_at
      FROM files WHERE tenant_id = ?`;
    const binds = [tenantId];
    if (conversationId) {
      sql += ' AND conversation_id = ?';
      binds.push(conversationId);
    }
    sql += ' ORDER BY created_at DESC LIMIT 500';
    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    const files = results || [];
    return json({ success: true, files, total: files.length }, 200, corsHeaders);
  } catch (e) {
    console.error('handleFilesGet:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleFilesGetOne(request, env, corsHeaders, id) {
  try {
    const tenantId = getTenantId(request);
    const file = await env.DB.prepare('SELECT * FROM files WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first();
    if (!file) {
      return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    }
    return json({ success: true, file }, 200, corsHeaders);
  } catch (e) {
    console.error('handleFilesGetOne:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleFilesDelete(request, env, corsHeaders, id) {
  try {
    const tenantId = getTenantId(request);
    const existing = await env.DB.prepare('SELECT id, r2_key FROM files WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first();
    if (!existing) {
      return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    }
    // Best-effort R2 object cleanup
    if (hasR2(env) && existing.r2_key && !String(existing.r2_key).startsWith('stub://')) {
      try {
        await env.FILES_R2.delete(existing.r2_key);
      } catch (r2err) {
        console.warn('handleFilesDelete: R2 delete failed:', r2err.message);
      }
    }
    await env.DB.prepare('DELETE FROM files WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
    return json({ success: true, id: Number(id) }, 200, corsHeaders);
  } catch (e) {
    console.error('handleFilesDelete:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleFilesUpload(request, env, corsHeaders) {
  try {
    const form = await request.formData();
    const fileField = form.get('file');
    if (!fileField || typeof fileField === 'string') {
      return json({ success: false, error: 'file field required' }, 400, corsHeaders);
    }

    const filename = fileField.name || 'upload.bin';
    const mimeType = fileField.type || 'application/octet-stream';
    const size = fileField.size ?? null;

    if (!ALLOWED_MIMES.has(mimeType)) {
      return json({ success: false, error: 'Unsupported file type' }, 415, corsHeaders);
    }
    if (size && size > MAX_FILE_SIZE) {
      return json({ success: false, error: 'File too large (max 10MB)' }, 413, corsHeaders);
    }
    const conversationId = form.get('conversation_id') || null;
    const uploadedBy = form.get('uploaded_by') || form.get('uploaded_by_id') || null;
    const tenantId = form.get('tenant_id') || 'tenant_default';

    let r2Key;
    if (hasR2(env)) {
      const id = uuidv4();
      r2Key = `files/${tenantId}/${id}/${filename}`;
      try {
        // File extends Blob; streaming body keeps memory low.
        const body = fileField.stream ? fileField.stream() : await fileField.arrayBuffer();
        await env.FILES_R2.put(r2Key, body, {
          httpMetadata: mimeType ? { contentType: mimeType } : undefined,
        });
      } catch (r2err) {
        console.error('handleFilesUpload: R2 put failed:', r2err.message);
        return json({ success: false, error: 'Upload storage failed' }, 502, corsHeaders);
      }
    } else {
      console.warn('handleFilesUpload: FILES_R2 binding missing — using stub');
      r2Key = 'stub://not-implemented';
    }

    const result = await env.DB.prepare(
      `INSERT INTO files (tenant_id, conversation_id, filename, size, mime_type, r2_key, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(tenantId, conversationId, filename, size, mimeType, r2Key, uploadedBy).run();

    return json({ success: true, id: result.meta?.last_row_id, r2_key: r2Key }, 200, corsHeaders);
  } catch (e) {
    console.error('handleFilesUpload:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

/**
 * GET /api/files/:id/download — Stream file bytes from R2.
 * Returns 501 if the record is a stub (R2 was not configured at upload time).
 */
export async function handleFileDownload(request, env, corsHeaders, id) {
  try {
    const tenantId = getTenantId(request);
    const file = await env.DB.prepare(
      'SELECT id, filename, mime_type, r2_key FROM files WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first();
    if (!file) {
      return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    }
    const key = file.r2_key || '';
    if (!key || key.startsWith('stub://')) {
      return json({ success: false, error: 'File not stored in R2 (stub)' }, 501, corsHeaders);
    }
    if (!hasR2(env)) {
      return json({ success: false, error: 'R2 binding not configured' }, 501, corsHeaders);
    }
    const obj = await env.FILES_R2.get(key);
    if (!obj) {
      return json({ success: false, error: 'R2 object missing' }, 404, corsHeaders);
    }
    const headers = new Headers(corsHeaders);
    const rawMime = file.mime_type || obj.httpMetadata?.contentType || 'application/octet-stream';
    const mimeType = ALLOWED_MIMES.has(rawMime) ? rawMime : 'application/octet-stream';
    headers.set('Content-Type', mimeType);
    if (file.filename) {
      const rawName = String(file.filename || 'download');
      // ASCII-safe version for legacy clients
      const asciiSafe = rawName.replace(/[^\x20-\x7E]|["\\\r\n;]/g, '_').slice(0, 255);
      // UTF-8 encoded for modern clients (RFC 6266)
      const utf8Encoded = encodeURIComponent(rawName).replace(/['()]/g, escape).replace(/\*/g, '%2A');
      headers.set('Content-Disposition', `attachment; filename="${asciiSafe}"; filename*=UTF-8''${utf8Encoded}`);
    }
    return new Response(obj.body, { status: 200, headers });
  } catch (e) {
    console.error('handleFileDownload:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
