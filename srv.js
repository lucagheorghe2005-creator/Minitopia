// =====================================================
//  Minitopia — Backend Express
//  npm install express @prisma/client argon2 jsonwebtoken cors dotenv
//  npx prisma migrate dev --name init
// =====================================================

import express from "express";
import cors from "cors";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { PrismaClient, AppointmentType, AgeGroup, Status } from "@prisma/client";
import "dotenv/config";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
// make sure to change .env
const JWT_SECRET = process.env.JWT_SECRET || "ceva_random";

app.use(cors());
app.use(express.json());

// ─── Middleware JWT ────────────────────────────────
function authAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Neautorizat" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token invalid" });
  }
}

// ─── PUBLIC: Rezervări ─────────────────────────────
// POST /api/rezervari
app.post("/api/rezervari", async (req, res) => {
  const { name, email, phone, date, kids, age, pack, notes } = req.body;

  if (!name || !email || !phone || !date || !kids || !age || !pack) {
    return res.status(400).json({ error: "Câmpuri obligatorii lipsă" });
  }

  const parsed = new Date(date);
  if (isNaN(parsed)) return res.status(400).json({ error: "Dată invalidă" });

  try {
    const appt = await prisma.appointment.create({
      data: { name, email, phone, date: parsed, kids: Number(kids), age, type: pack, notes },
    });
    res.status(201).json(appt);
  } catch (err) {
    // unique constraint pe date — slot ocupat
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Slotul este deja rezervat" });
    }
    console.error(err);
    res.status(500).json({ error: "Eroare server" });
  }
});

// ─── PUBLIC: Recenzii ──────────────────────────────
// GET /api/recenzii
app.get("/api/recenzii", async (_req, res) => {
  const reviews = await prisma.review.findMany({
    orderBy: { created: "desc" },
  });
  res.json(reviews);
});

// POST /api/recenzii
app.post("/api/recenzii", async (req, res) => {
  const { name, rating, text } = req.body;

  if (!name || !rating) {
    return res.status(400).json({ error: "Nume și rating obligatorii" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating între 1 și 5" });
  }

  const review = await prisma.review.create({
    data: { name, rating: Number(rating), text },
  });
  res.status(201).json(review);
});

// ─── ADMIN: Login ──────────────────────────────────
// POST /api/admin/login
app.post("/api/admin/login", async (req, res) => {
  const { name, password } = req.body;
  const admin = await prisma.adminAccount.findUnique({ where: { name } });

  if (!admin || !(await argon2.verify(admin.password, password))) {
    return res.status(401).json({ error: "Nume sau parola incorecta" });
  }

  const token = jwt.sign({ id: admin.id, name: admin.name }, JWT_SECRET, {
    expiresIn: "8h",
  });
  res.json({ token });
});

// ─── ADMIN: Rezervari ──────────────────────────────
// GET /api/admin/rezervari?status=Pending
app.get("/api/admin/rezervari", authAdmin, async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const list = await prisma.appointment.findMany({
    where,
    orderBy: { date: "asc" },
  });
  res.json(list);
});

// PATCH /api/admin/rezervari/:id  { status: "Accepted" | "Rejected" }
app.patch("/api/admin/rezervari/:id", authAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["Accepted", "Rejected", "Pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid" });
  }
  try {
    const updated = await prisma.appointment.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

// DELETE /api/admin/rezervari/:id
app.delete("/api/admin/rezervari/:id", authAdmin, async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

// ─── ADMIN: Creare cont (rulat o singură dată) ──────
// POST /api/admin/register  { name, password }
app.post("/api/admin/register", async (req, res) => {
  const { name, password, secret } = req.body;
  // Protecție minimă: trimite un secret din .env pentru a activa ruta
  if (secret !== process.env.REGISTER_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const hashed = await argon2.hash(password, { type: argon2.argon2id });
  try {
    const admin = await prisma.adminAccount.create({ data: { name, password: hashed } });
    res.status(201).json({ id: admin.id, name: admin.name });
  } catch {
    res.status(409).json({ error: "Contul există deja" });
  }
});

// ─── Start ─────────────────────────────────────────
app.listen(PORT, () => console.log(`Minitopia server pornit pe portul ${PORT}`));
