// ============================================================
//  Make uploaded videos play in every browser.
//  Phones often record HEVC (H.265), which Chrome on many devices
//  and Firefox can't play. When an upload is HEVC, convert it to
//  H.264 (the format every browser plays) with ffmpeg, if the
//  server has it: FFMPEG_PATH, `ffmpeg` on PATH, or the binary
//  bundled by the imageio-ffmpeg Python package.
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync, spawn } = require('child_process');

// Read the start and end of the file (the codec name sits in the "moov" box at one end)
function codecOf(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size, n = Math.min(size, 4 * 1024 * 1024);
    const head = Buffer.alloc(n); fs.readSync(fd, head, 0, n, 0);
    const tail = Buffer.alloc(n); fs.readSync(fd, tail, 0, n, Math.max(0, size - n));
    const s = head.toString('latin1') + tail.toString('latin1');
    if (/hvc1|hev1/.test(s)) return 'hevc';
    if (/avc1/.test(s)) return 'h264';
    if (/vp09|vp08/.test(s)) return 'vp9';
    if (/av01/.test(s)) return 'av1';
    return 'unknown';
  } finally { fs.closeSync(fd); }
}

let cached;
function findFfmpeg() {
  if (cached !== undefined) return cached;
  const local = path.join(__dirname, '..', 'tools', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  const candidates = [process.env.FFMPEG_PATH, fs.existsSync(local) ? local : null, 'ffmpeg'];
  try { // bundled with the imageio-ffmpeg Python package, if installed
    const dir = spawnSync('python', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8', timeout: 8000 });
    if (dir.status === 0 && dir.stdout.trim()) candidates.push(dir.stdout.trim());
  } catch { /* python not available */ }
  cached = candidates.filter(Boolean).find((c) => { try { return spawnSync(c, ['-version'], { timeout: 8000 }).status === 0; } catch { return false; } }) || null;
  return cached;
}

// Convert to H.264 + AAC, fast start. Resolves with the new file path.
function toH264(file) {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) return Promise.reject(new Error('no-ffmpeg'));
  const out = path.join(path.dirname(file), `${crypto.randomBytes(12).toString('hex')}.mp4`);
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, ['-y', '-i', file, '-c:v', 'libx264', '-preset', 'medium', '-crf', '27', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(min(1280\\,iw)/2)*2:-2', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], { stdio: 'ignore' });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 && fs.existsSync(out) && fs.statSync(out).size > 0 ? resolve(out) : reject(new Error('convert-failed'))));
  });
}

// After an upload: returns { url, converted, warning }
async function ensurePlayable(url, file) {
  if (codecOf(file) !== 'hevc') return { url, converted: false };
  try {
    const out = await toH264(file);
    fs.rmSync(file, { force: true });
    return { url: `/uploads/videos/${path.basename(out)}`, converted: true };
  } catch {
    return { url, converted: false, warning: 'This video is in HEVC (H.265) format, which many browsers can\'t play, so it may not show on the website. Please export it as H.264 MP4 (on iPhone: Settings → Camera → Formats → Most Compatible), or upload it to YouTube and paste the link.' };
  }
}

module.exports = { codecOf, findFfmpeg, toH264, ensurePlayable };
