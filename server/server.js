// YouTube Audio Extraction & Streaming Server (Standalone Runner)
// Powered by yt-dlp & handleApiRequest
const http = require('http');
const { handleApiRequest, getLocalIp } = require('./apiHandler');

const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
  handleApiRequest(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLocalIp();
  console.log(`\n======================================================`);
  console.log(`🎵 YouTube Audio Extraction Server is ACTIVE`);
  console.log(`📡 Local URL:   http://localhost:${PORT}`);
  console.log(`📱 Phone LAN:   http://${lanIp}:${PORT}`);
  console.log(`======================================================\n`);
});

module.exports = server;
