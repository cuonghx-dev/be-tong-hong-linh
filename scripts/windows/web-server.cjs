/**
 * Static server cho SPA `apps/web/dist` + reverse proxy `/api` sang NestJS.
 *
 * Chạy trên Windows Server không cần IIS/nginx/gói npm ngoài (chỉ Node core),
 * nên web và api dùng chung origin → `VITE_API_URL=/api` hoạt động, không cần CORS.
 *
 * Biến môi trường:
 *   WEB_PORT   cổng lắng nghe (mặc định 8080)
 *   WEB_HOST   địa chỉ bind (mặc định 0.0.0.0)
 *   API_PORT   cổng NestJS để proxy `/api` (mặc định 3000)
 *   API_HOST   host NestJS (mặc định 127.0.0.1)
 *   WEB_ROOT   thư mục dist (mặc định <repo>/apps/web/dist)
 */
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const WEB_PORT = Number(process.env.WEB_PORT ?? 8080)
const WEB_HOST = process.env.WEB_HOST ?? '0.0.0.0'
const API_PORT = Number(process.env.API_PORT ?? 3000)
const API_HOST = process.env.API_HOST ?? '127.0.0.1'
const WEB_ROOT = path.resolve(
  process.env.WEB_ROOT ?? path.join(__dirname, '..', '..', 'apps', 'web', 'dist'),
)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function proxyToApi(req, res) {
  const upstream = http.request(
    {
      host: API_HOST,
      port: API_PORT,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: `${API_HOST}:${API_PORT}` },
    },
    (upRes) => {
      res.writeHead(upRes.statusCode ?? 502, upRes.headers)
      upRes.pipe(res)
    },
  )
  upstream.on('error', (err) => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`Khong ket noi duoc API (${API_HOST}:${API_PORT}): ${err.message}`)
  })
  req.pipe(upstream)
}

function sendFile(res, filePath, { immutable = false } = {}) {
  const ext = path.extname(filePath).toLowerCase()
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    // File trong /assets có hash trong tên → cache vĩnh viễn; index.html thì không.
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  fs.createReadStream(filePath).pipe(res)
}

const server = http.createServer((req, res) => {
  if (req.url === '/api' || req.url.startsWith('/api/') || req.url.startsWith('/api?')) {
    return proxyToApi(req, res)
  }

  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0])
  // Chặn path traversal: resolve xong phải còn nằm trong WEB_ROOT.
  const candidate = path.resolve(path.join(WEB_ROOT, urlPath))
  const inRoot = candidate === WEB_ROOT || candidate.startsWith(WEB_ROOT + path.sep)
  const indexHtml = path.join(WEB_ROOT, 'index.html')

  if (inRoot && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return sendFile(res, candidate, { immutable: urlPath.startsWith('/assets/') })
  }

  // SPA fallback: mọi route client-side (/cash/vouchers/…) trả index.html.
  if (fs.existsSync(indexHtml)) return sendFile(res, indexHtml)

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  res.end(`Khong tim thay ${WEB_ROOT}. Chay "pnpm build" truoc.`)
})

server.listen(WEB_PORT, WEB_HOST, () => {
  console.log(`[web] serve ${WEB_ROOT} tai http://${WEB_HOST}:${WEB_PORT}`)
  console.log(`[web] proxy /api -> http://${API_HOST}:${API_PORT}`)
})
