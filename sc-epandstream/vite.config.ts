import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hanya untuk `npm run dev`: menjalankan api/proxy.ts (scraper + adapter) di
// server dev Vite, meniru rewrite /api/* milik Vercel. Tidak dipakai saat build.
function localApi(): Plugin {
  return {
    name: "local-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();
        try {
          const pathname = new URL(req.url, "http://localhost").pathname;
          const mod = await server.ssrLoadModule("/api/proxy.ts");
          const vReq: any = req;
          vReq.query = { path: pathname.replace(/^\/api/, "") || "/" };
          const vRes: any = res;
          vRes.status = (code: number) => {
            res.statusCode = code;
            return vRes;
          };
          vRes.json = (body: unknown) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
            return vRes;
          };
          await mod.default(vReq, vRes);
        } catch (e: any) {
          console.error(e);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: e?.message || "Internal server error" }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), localApi()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
