// Universal API & Audio Streaming Handler
// Shared between standalone server (port 5000) and Metro dev server middleware (port 8081)
const { spawn, execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Serve audio file with full HTTP 206 Partial Content (Range request) support
function serveAudioFile(filePath, req, res) {
  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
          'Content-Type': 'text/plain',
        });
        return res.end('Requested range not satisfiable');
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mp4',
        'Cache-Control': 'public, max-age=86400',
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': 'audio/mp4',
        'Cache-Control': 'public, max-age=86400',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('[SERVE ERROR]:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error reading audio file');
    }
  }
}

const activeDownloads = new Map();
const paletteCache = new Map();

function getArtworkPalette(target) {
  if (!target) return Promise.resolve(null);
  if (paletteCache.has(target)) {
    return Promise.resolve(paletteCache.get(target));
  }

  return new Promise((resolve) => {
    const pyScript = path.join(__dirname, 'paletteExtractor.py');
    const child = spawn('python', [pyScript, target]);
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed && parsed.primary) {
          paletteCache.set(target, parsed);
          resolve(parsed);
          return;
        }
      } catch (e) {}
      resolve(null);
    });
    child.on('error', () => resolve(null));
  });
}

const studioCache = new Map();

function resolveStudioAudio(videoId) {
  if (!videoId) return Promise.resolve(null);
  if (studioCache.has(videoId)) {
    return Promise.resolve(studioCache.get(videoId));
  }
  const cacheFile = path.join(CACHE_DIR, `${videoId}_studio.json`);
  if (fs.existsSync(cacheFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (parsed && (parsed.studioVideoId || parsed.originalVideoId)) {
        studioCache.set(videoId, parsed);
        return Promise.resolve(parsed);
      }
    } catch (e) {}
  }

  return new Promise((resolve) => {
    const pyScript = path.join(__dirname, 'studioAudioResolver.py');
    const child = spawn('python', [pyScript, videoId]);
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed) {
          studioCache.set(videoId, parsed);
          resolve(parsed);
          return;
        }
      } catch (e) {}
      resolve(null);
    });
    child.on('error', (err) => {
      console.warn('[STUDIO RESOLVER] Execution error:', err.message);
      resolve(null);
    });
  });
}

function ensureAudioCached(videoId) {
  const cacheFile = path.join(CACHE_DIR, `${videoId}.m4a`);
  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 100000) {
    return Promise.resolve(cacheFile);
  }

  if (activeDownloads.has(videoId)) {
    return activeDownloads.get(videoId);
  }

  const promise = new Promise((resolve, reject) => {
    const tempFile = path.join(CACHE_DIR, `${videoId}_part_${Date.now()}.m4a`);
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`[CACHE] Downloading audio for seeking & caching: ${videoId}`);

    const child = spawn('python', [
      '-m',
      'yt_dlp',
      '-o',
      tempFile,
      '--no-playlist',
      '--quiet',
      '-f',
      'ba[ext=m4a]/ba/b',
      ytUrl,
    ]);

    child.on('close', (code) => {
      activeDownloads.delete(videoId);
      if (code === 0 && fs.existsSync(tempFile) && fs.statSync(tempFile).size > 50000) {
        try {
          if (fs.existsSync(cacheFile)) {
            try { fs.unlinkSync(cacheFile); } catch (e) {}
          }
          fs.renameSync(tempFile, cacheFile);
          console.log(`[CACHE] Cached successfully: ${cacheFile} (${(fs.statSync(cacheFile).size / (1024 * 1024)).toFixed(2)} MB)`);
          resolve(cacheFile);
        } catch (err) {
          resolve(fs.existsSync(cacheFile) ? cacheFile : tempFile);
        }
      } else {
        if (fs.existsSync(tempFile)) {
          try { fs.unlinkSync(tempFile); } catch (e) {}
        }
        reject(new Error(`yt-dlp download failed with code ${code}`));
      }
    });

    child.on('error', (err) => {
      activeDownloads.delete(videoId);
      reject(err);
    });
  });

  activeDownloads.set(videoId, promise);
  return promise;
}

// Detect local LAN IP for seamless mobile device connectivity on Wi-Fi
function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name in ifaces) {
    for (const net of ifaces[name]) {
      if (net.family === 'IPv4' && !net.internal && !name.toLowerCase().includes('vethernet')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function handleApiRequest(req, res, next) {
  // Universal CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Disposition, Accept-Ranges');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const hostHeader = req.headers.host || `${getLocalIp()}:8081`;
  const parsedUrl = new URL(req.url, `http://${hostHeader}`);

  // 1. Static images endpoint for album artwork
  if (parsedUrl.pathname.startsWith('/assets/images/')) {
    const filename = path.basename(parsedUrl.pathname);
    const imgPath = path.join(__dirname, '../assets/images', filename);
    if (fs.existsSync(imgPath)) {
      res.writeHead(200, {
        'Content-Type': filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      });
      fs.createReadStream(imgPath).pipe(res);
      return;
    } else {
      if (typeof next === 'function') return next();
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Image not found');
      return;
    }
  }

  // 2. Health check endpoint
  if (parsedUrl.pathname === '/health' || parsedUrl.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'YouTube Audio Extraction & Streaming Engine',
        lanIp: getLocalIp(),
      })
    );
    return;
  }

  // 3. Info endpoint: /api/audio?id=VIDEO_ID
  if (parsedUrl.pathname === '/api/audio') {
    const videoId = parsedUrl.searchParams.get('id');
    if (!videoId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing video ID parameter (?id=...)' }));
      return;
    }

    const proto = req.headers['x-forwarded-proto'] || 'http';
    const currentHost = req.headers.host || `${getLocalIp()}:8081`;
    const baseUrl = `${proto}://${currentHost}`;

    resolveStudioAudio(videoId).then(async (studioInfo) => {
      const isClean = !!(studioInfo && studioInfo.cleanStudioResolved);
      const targetVideoId = (isClean && studioInfo.studioVideoId) ? studioInfo.studioVideoId : videoId;

      if (isClean) {
        console.log(`[STUDIO AUDIO] Substituted MV (${videoId}) with clean studio track: ${targetVideoId} ("${studioInfo.studioTitle}")`);
      }

      // Optionally extract direct GoogleVideo audio URL with fast yt-dlp -g on targetVideoId
      let directUrl = null;
      try {
        const ytUrl = `https://www.youtube.com/watch?v=${targetVideoId}`;
        const stdout = execSync(`python -m yt_dlp -f "ba[ext=m4a]/ba/b" -g "${ytUrl}"`, {
          timeout: 7000,
          encoding: 'utf8',
        });
        const lines = stdout.trim().split('\n').filter(Boolean);
        if (lines.length > 0 && lines[lines.length - 1].startsWith('http')) {
          directUrl = lines[lines.length - 1].trim();
        }
      } catch (e) {
        console.warn('[API/AUDIO] Direct URL extraction notice:', e.message);
      }

      // Extract genuine YouTube thumbnail color palette (using original videoId for thumbnail match)
      let palette = null;
      try {
        palette = await getArtworkPalette(videoId);
      } catch (e) {}

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          videoId: targetVideoId,
          originalVideoId: videoId,
          isCleanStudio: isClean,
          cleanStudioResolved: isClean,
          isMusicVideo: !!(studioInfo && studioInfo.isMusicVideo),
          studioVideoId: targetVideoId,
          studioTitle: studioInfo ? studioInfo.studioTitle : null,
          studioDuration: studioInfo ? studioInfo.studioDuration : null,
          duration: (studioInfo && studioInfo.studioDuration) ? studioInfo.studioDuration : undefined,
          directUrl: directUrl,
          audioUrl: directUrl || `${baseUrl}/api/stream?id=${targetVideoId}`,
          streamUrl: `${baseUrl}/api/stream?id=${targetVideoId}`,
          downloadUrl: `${baseUrl}/api/download?id=${targetVideoId}&title=${encodeURIComponent(studioInfo?.studioTitle || 'track')}`,
          provider: directUrl ? 'yt-dlp-direct' : 'yt-dlp-stream',
          palette: palette || undefined,
        })
      );
    }).catch((err) => {
      console.error('[API/AUDIO] Studio resolution error:', err);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          videoId,
          originalVideoId: videoId,
          isCleanStudio: false,
          audioUrl: `${baseUrl}/api/stream?id=${videoId}`,
          streamUrl: `${baseUrl}/api/stream?id=${videoId}`,
          downloadUrl: `${baseUrl}/api/download?id=${videoId}`,
          provider: 'yt-dlp-stream',
        })
      );
    });
    return;
  }

  // 3b. Dedicated Palette Extraction endpoint: /api/palette?id=... or /api/palette?url=...
  if (parsedUrl.pathname === '/api/palette') {
    const videoId = parsedUrl.searchParams.get('id');
    const imgUrl = parsedUrl.searchParams.get('url');
    const target = imgUrl || videoId;

    if (!target) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing id or url parameter' }));
      return;
    }

    getArtworkPalette(target).then((palette) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(palette || {}));
    }).catch(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
    });
    return;
  }

  // 4. Real-time Audio Stream endpoint: /api/stream?id=VIDEO_ID
  if (parsedUrl.pathname === '/api/stream') {
    const videoId = parsedUrl.searchParams.get('id');
    if (!videoId) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing video ID');
      return;
    }

    resolveStudioAudio(videoId).then((studioInfo) => {
      const targetVideoId = (studioInfo && studioInfo.cleanStudioResolved && studioInfo.studioVideoId)
        ? studioInfo.studioVideoId
        : videoId;

      const cacheFile = path.join(CACHE_DIR, `${targetVideoId}.m4a`);
      if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 100000) {
        return serveAudioFile(cacheFile, req, res);
      }

      // Ensure clean audio is cached and served with HTTP 206 support
      ensureAudioCached(targetVideoId)
        .then((savedPath) => {
          serveAudioFile(savedPath, req, res);
        })
        .catch((err) => {
          console.error('[STREAM ERROR] Fallback to live pipe:', err);
          const ytUrl = `https://www.youtube.com/watch?v=${targetVideoId}`;
          const child = spawn('python', [
            '-m',
            'yt_dlp',
            '-o',
            '-',
            '--no-playlist',
            '--quiet',
            '-f',
            'ba[ext=m4a]/ba/b',
            ytUrl,
          ]);
          res.writeHead(200, {
            'Content-Type': 'audio/mp4',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache',
          });
          child.stdout.pipe(res);
          req.on('close', () => child.kill('SIGTERM'));
        });
    });
    return;
  }

  // 5. Direct MP3 File Download endpoint: /api/download?id=VIDEO_ID&title=...
  if (parsedUrl.pathname === '/api/download') {
    const videoId = parsedUrl.searchParams.get('id');
    const rawTitle = parsedUrl.searchParams.get('title') || 'YouTube_Audio';
    const safeTitle = encodeURIComponent(rawTitle.replace(/[^a-zA-Z0-9_\s-]/g, '').trim() || 'Track');

    if (!videoId) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing video ID');
      return;
    }

    resolveStudioAudio(videoId).then((studioInfo) => {
      const targetVideoId = (studioInfo && studioInfo.cleanStudioResolved && studioInfo.studioVideoId)
        ? studioInfo.studioVideoId
        : videoId;

      // If already cached, serve the cached file with download headers
      const cacheFile = path.join(CACHE_DIR, `${targetVideoId}.m4a`);
      if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 100000) {
        res.writeHead(200, {
          'Content-Type': 'audio/mp4',
          'Content-Disposition': `attachment; filename="${safeTitle}.m4a"`,
          'Content-Length': fs.statSync(cacheFile).size,
        });
        fs.createReadStream(cacheFile).pipe(res);
        return;
      }

      const ytUrl = `https://www.youtube.com/watch?v=${targetVideoId}`;
      console.log(`[DOWNLOAD] Generating clean audio download for: ${targetVideoId} (${rawTitle})`);

      const child = spawn('python', [
        '-m',
        'yt_dlp',
        '-o',
        '-',
        '--no-playlist',
        '--quiet',
        '-f',
        'ba[ext=m4a]/ba/b',
        ytUrl,
      ]);

      res.writeHead(200, {
        'Content-Type': 'audio/mp4',
        'Content-Disposition': `attachment; filename="${safeTitle}.m4a"`,
        'Cache-Control': 'no-cache',
      });

      child.stdout.pipe(res);

      child.stderr.on('data', (data) => {
        const msg = data.toString();
        if (!msg.includes('WARNING')) {
          console.error('[DOWNLOAD ERROR]:', msg);
        }
      });

      req.on('close', () => {
        child.kill('SIGTERM');
      });
    });
    return;
  }

  // Helper: Parse LRC format string into structured timed lines
  function parseLrc(lrcText) {
    if (!lrcText || typeof lrcText !== 'string') return [];
    const lines = lrcText.split(/\r?\n/);
    const parsed = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      timeRegex.lastIndex = 0;
      const matches = [...trimmed.matchAll(timeRegex)];
      if (matches.length === 0) continue;
      const text = trimmed.replace(timeRegex, '').trim();
      for (const match of matches) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const millisPart = match[3];
        let millis = 0;
        if (millisPart) {
          millis = millisPart.length === 2 ? parseInt(millisPart, 10) * 10 : parseInt(millisPart, 10);
        }
        const timeInSeconds = mins * 60 + secs + millis / 1000;
        parsed.push({ time: parseFloat(timeInSeconds.toFixed(2)), text });
      }
    }
    return parsed.sort((a, b) => a.time - b.time);
  }

  // 6. Proxied Lyrics endpoint: /api/lyrics?title=...&artist=...&duration=...
  if (parsedUrl.pathname === '/api/lyrics') {
    const rawTitle = parsedUrl.searchParams.get('title') || '';
    const rawArtist = parsedUrl.searchParams.get('artist') || '';
    const duration = parsedUrl.searchParams.get('duration') || '';

    let artist = rawArtist;
    let title = rawTitle;

    const hyphenMatch = rawTitle.split(/\s+[-–—:]\s+/);
    if (hyphenMatch.length >= 2) {
      artist = hyphenMatch[0].trim();
      title = hyphenMatch.slice(1).join(' - ').trim();
    }

    // Clean noise
    title = title.replace(/\s*[\(\[](official\s*(music\s*)?video|lyrics?|audio|official|visualizer|hd|4k|mv|remastered|explicit)[\)\]]/gi, '').trim();
    artist = artist.replace(/\s*[\(\[](official\s*(music\s*)?video|lyrics?|audio|official|visualizer|hd|4k|mv|remastered|explicit)[\)\]]/gi, '').trim();

    console.log(`[LYRICS PROXY] Searching for: artist="${artist}", title="${title}"`);

    async function fetchLrclib() {
      // 1. Try exact match
      const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}${duration ? `&duration=${Math.round(duration)}` : ''}`;
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'MusicPlayerApp/1.0 (Node)' }
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        console.warn('[LYRICS] Exact match failed:', e.message);
      }

      // 2. Try search query with extracted artist & title
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${title}`.trim())}`;
      try {
        const searchRes = await fetch(searchUrl, {
          headers: { 'User-Agent': 'MusicPlayerApp/1.0 (Node)' }
        });
        if (searchRes.ok) {
          const list = await searchRes.json();
          if (Array.isArray(list) && list.length > 0) {
            return list.find(item => item.syncedLyrics) || list[0];
          }
        }
      } catch (e) {
        console.warn('[LYRICS] Search query failed:', e.message);
      }

      // 3. Fallback to lyrics.ovh for plain text
      try {
        const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
        const ovhRes = await fetch(ovhUrl);
        if (ovhRes.ok) {
          const ovhData = await ovhRes.json();
          if (ovhData.lyrics) {
            return {
              trackName: title,
              artistName: artist,
              plainLyrics: ovhData.lyrics,
              syncedLyrics: null,
            };
          }
        }
      } catch (e) {}

      return null;
    }

    fetchLrclib()
      .then(result => {
        if (result) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Lyrics not found' }));
        }
      })
      .catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
    return;
  }

  // If next is provided (Metro middleware), hand over unhandled routes
  if (typeof next === 'function') {
    return next();
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

module.exports = {
  handleApiRequest,
  getLocalIp,
};
