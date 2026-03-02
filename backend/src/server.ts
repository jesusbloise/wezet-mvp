import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import pool from "./db/pool";
import authRoutes from "./routes/auth";
import projectsRoutes from "./routes/projects";
import negotiationsRoutes from "./routes/negotiations";
import negotiationDetailRoutes from "./routes/negotiationDetail";
import quotesRoutes from "./routes/quotes";
import publicQuotesRoutes from "./routes/publicQuotes";
import dashboardRoutes from "./routes/dashboard";

const app = express();

app.use(express.json());
app.use(cookieParser());

// ✅ CORS PRO: permite varios orígenes
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://192.168.0.56:3000",
  "http://192.168.0.56:3001",
];

app.use(
  cors({
    origin: (origin, cb) => {
      // requests tipo Postman/Thunder a veces vienen sin origin
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// Opcional: para que al entrar a http://localhost:4000 no salga "Cannot GET /"
app.get("/", (_req, res) => {
  res.send("WEZET API OK. Use /health");
});

// Healthcheck
app.get("/health", async (_req, res) => {
  try {
    const r = await pool.query("select 1 as ok");
    res.json({ ok: true, db: r.rows[0].ok });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Rutas Auth
app.use("/auth", authRoutes);
app.use("/projects", projectsRoutes);
app.use("/negotiations", negotiationsRoutes);
app.use("/negotiations", negotiationDetailRoutes);
app.use("/", quotesRoutes);          // /projects/:id/quotes, /quotes/:id...
app.use("/public", publicQuotesRoutes); // /public/quote/:publicId
app.use("/api/dashboard", dashboardRoutes);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
