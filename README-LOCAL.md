# Menjalankan di lokal

    npm install
    npm run dev

Buka http://localhost:5173 (port sesuai output Vite).
Request `/api/*` dilayani langsung oleh `api/proxy.ts` (scraper otakudesu + adapter).

Persyaratan: Node.js 18.17+ (disarankan 20/22).

Deploy ke Vercel: `vercel.json` sudah cocok, tidak perlu diubah.

Cek cepat scraper tanpa UI (saat dev berjalan):
    http://localhost:5173/api/home
    http://localhost:5173/api/schedule
    http://localhost:5173/api/search/naruto
