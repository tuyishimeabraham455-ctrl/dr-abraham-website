// ============================================================
//  File uploads (profile pictures, background videos)
//  Files are streamed to UPLOAD_DIR (default: "uploads" next to
//  the database, so they live on the same persistent disk) and
//  served at /uploads/<kind>/<file>. The file type is checked
//  from its first bytes, never trusted from the browser.
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'maya_sterling.db');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(path.dirname(DB_PATH), 'uploads');

const KINDS = {
  avatars: { maxBytes: 3 * 1024 * 1024, types: ['jpg', 'png', 'webp'] },
  photos: { maxBytes: 12 * 1024 * 1024, types: ['jpg', 'png', 'webp'] },
  videos: { maxBytes: (Number(process.env.MAX_VIDEO_MB) || 200) * 1024 * 1024, types: ['mp4', 'webm'] },
  audio: { maxBytes: 150 * 1024 * 1024, types: ['mp3', 'mp4', 'wav', 'ogg', 'webm'] },
};

// Recognise the file from its first bytes
function sniff(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.length >= 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WAVE') return 'wav';
  if (buf.length >= 4 && buf.slice(0, 4).toString('latin1') === 'OggS') return 'ogg';
  if (buf.length >= 3 && (buf.slice(0, 3).toString('latin1') === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0))) return 'mp3';
  if (buf.length >= 12 && buf.slice(4, 8).toString('latin1') === 'ftyp') return 'mp4';
  if (buf.length >= 4 && buf.readUInt32BE(0) === 0x1a45dfa3) return 'webm';
  return null;
}

// Stream the request body to disk. Resolves { url, file } or rejects with { status, message }.
function saveUpload(req, kind) {
  const spec = KINDS[kind];
  const dir = path.join(UPLOAD_DIR, kind);
  fs.mkdirSync(dir, { recursive: true });
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > spec.maxBytes) return Promise.reject({ status: 413, message: `That file is too big. The limit is ${Math.round(spec.maxBytes / 1048576)} MB.` });
  const tmp = path.join(dir, `.${crypto.randomBytes(8).toString('hex')}.part`);

  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(tmp);
    let size = 0, head = Buffer.alloc(0), failed = false;
    const fail = (status, message) => {
      if (failed) return; failed = true;
      req.unpipe?.(out); out.destroy(); fs.rm(tmp, { force: true }, () => {});
      req.resume();
      reject({ status, message });
    };
    req.on('data', (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > spec.maxBytes) return fail(413, `That file is too big. The limit is ${Math.round(spec.maxBytes / 1048576)} MB.`);
      if (head.length < 16) head = Buffer.concat([head, chunk]).slice(0, 16);
      if (!out.write(chunk)) { req.pause(); out.once('drain', () => req.resume()); }
    });
    req.on('end', () => {
      if (failed) return;
      out.end(() => {
        const type = sniff(head);
        if (!size) return fail(400, 'The file was empty.');
        if (!type || !spec.types.includes(type)) return fail(415, kind === 'audio' ? 'Please choose an MP3, M4A, WAV or OGG audio file.' : kind !== 'videos' ? 'Please choose a JPG, PNG or WebP picture.' : 'Please choose an MP4 or WebM video.');
        const name = `${crypto.randomBytes(12).toString('hex')}.${type}`;
        fs.rename(tmp, path.join(dir, name), (err) => (err ? fail(500, 'Could not save the file.') : resolve({ url: `/uploads/${kind}/${name}`, file: path.join(dir, name), size })));
      });
    });
    req.on('error', () => fail(400, 'The upload was interrupted. Please try again.'));
  });
}

// Remove an uploaded file by its /uploads/... URL (ignores anything else)
function removeUpload(url) {
  const m = /^\/uploads\/(avatars|photos|videos|audio)\/([a-f0-9]{24}\.(jpg|png|webp|mp4|webm|mp3|wav|ogg))$/.exec(String(url || ''));
  if (m) fs.rm(path.join(UPLOAD_DIR, m[1], m[2]), { force: true }, () => {});
}

module.exports = { UPLOAD_DIR, saveUpload, removeUpload, sniff };
