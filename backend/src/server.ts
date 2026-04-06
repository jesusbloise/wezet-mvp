import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import pool from "./db/pool";
import authRoutes from "./routes/auth";
import projectsRoutes from "./routes/projects";
import negotiationsRoutes from "./routes/negotiations";
import negotiationDetailRoutes from "./routes/negotiationDetail";
import quotesRoutes from "./routes/quotes";
import publicQuotesRoutes from "./routes/publicQuotes";
import dashboardRoutes from "./routes/dashboard";
import contactsRoutes from "./routes/contacts";
import meRoutes from "./routes/me";
import teamRoutes from "./routes/team";
import aiRoutes from "./routes/ai";
import ndasRoutes from "./routes/ndas";

import { requireAuth } from "./middlewares/requireAuth";

const app = express();

app.use(express.json());
app.use(cookieParser());
const envOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((v) => v.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://192.168.0.56:3000",
  "http://192.168.0.56:3001",
  ...envOrigins,
].map((v) => v.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      const normalizedOrigin = origin.trim().replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return cb(null, true);
      }

      console.log("CORS_ORIGIN env:", process.env.CORS_ORIGIN);
      console.log("allowedOrigins:", allowedOrigins);
      console.log("incoming origin:", origin);

      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// const envOrigins = (process.env.CORS_ORIGIN || "")
//   .split(",")
//   .map((v) => v.trim())
//   .filter(Boolean);

// const allowedOrigins = [
//   "http://localhost:3000",
//   "http://localhost:3001",
//   "http://192.168.0.56:3000",
//   "http://192.168.0.56:3001",
//   ...envOrigins,
// ];

// app.use(
//   cors({
//     origin: (origin, cb) => {
//       if (!origin) return cb(null, true);
//       if (allowedOrigins.includes(origin)) return cb(null, true);
//       return cb(new Error(`CORS blocked: ${origin}`));
//     },
//     credentials: true,
//   })
// );

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.send("WEZET API OK. Use /health");
});

app.get("/health", async (_req, res) => {
  try {
    const r = await pool.query("select 1 as ok");
    res.json({ ok: true, db: r.rows[0].ok });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.use("/auth", authRoutes);
app.use("/projects", projectsRoutes);
app.use("/negotiations", negotiationsRoutes);
app.use("/negotiations", negotiationDetailRoutes);
app.use("/", quotesRoutes);
app.use("/public", publicQuotesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/me", meRoutes);
app.use("/team", teamRoutes);
app.use("/contacts", requireAuth, contactsRoutes);
app.use("/ai", aiRoutes);
app.use("/ndas", ndasRoutes);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

// import "dotenv/config";
// import express from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import path from "path";

// import pool from "./db/pool";
// import authRoutes from "./routes/auth";
// import projectsRoutes from "./routes/projects";
// import negotiationsRoutes from "./routes/negotiations";
// import negotiationDetailRoutes from "./routes/negotiationDetail";
// import quotesRoutes from "./routes/quotes";
// import publicQuotesRoutes from "./routes/publicQuotes";
// import dashboardRoutes from "./routes/dashboard";
// import contactsRoutes from "./routes/contacts";
// import meRoutes from "./routes/me";
// import teamRoutes from "./routes/team";
// import aiRoutes from "./routes/ai";
// import ndasRoutes from "./routes/ndas";

// import { requireAuth } from "./middlewares/requireAuth";

// const app = express();

// app.use(express.json());
// app.use(cookieParser());

// const allowedOrigins = [
//   "http://localhost:3000",
//   "http://localhost:3001",
//   "http://192.168.0.56:3000",
//   "http://192.168.0.56:3001",
// ];

// app.use(
//   cors({
//     origin: (origin, cb) => {
//       if (!origin) return cb(null, true);
//       if (allowedOrigins.includes(origin)) return cb(null, true);
//       return cb(new Error(`CORS blocked: ${origin}`));
//     },
//     credentials: true,
//   })
// );

// app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// app.get("/", (_req, res) => {
//   res.send("WEZET API OK. Use /health");
// });

// app.get("/health", async (_req, res) => {
//   try {
//     const r = await pool.query("select 1 as ok");
//     res.json({ ok: true, db: r.rows[0].ok });
//   } catch (e: any) {
//     res.status(500).json({ ok: false, error: e?.message || String(e) });
//   }
// });

// app.use("/auth", authRoutes);
// app.use("/projects", projectsRoutes);
// app.use("/negotiations", negotiationsRoutes);
// app.use("/negotiations", negotiationDetailRoutes);
// app.use("/", quotesRoutes);
// app.use("/public", publicQuotesRoutes);
// app.use("/api/dashboard", dashboardRoutes);
// app.use("/me", meRoutes);
// app.use("/team", teamRoutes);
// app.use("/contacts", requireAuth, contactsRoutes);
// app.use("/ai", aiRoutes);
// app.use("/ndas", ndasRoutes);

// const port = Number(process.env.PORT) || 4000;
// app.listen(port, () => {
//   console.log(`API running on http://localhost:${port}`);
// });

