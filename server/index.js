import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import OpenAI from "openai";

const app = express();
const port = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production";
const MONGO_URI = process.env.MONGO_URI;
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map(x => x.trim()) : true }));
app.use(express.json({ limit: "8mb" }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  healthData: {
    glucose: { type: Array, default: [] },
    insulin: { type: Array, default: [] },
    meals: { type: Array, default: [] }
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

function issueToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: "30d" });
}

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

function cleanData(data = {}) {
  return {
    glucose: Array.isArray(data.glucose) ? data.glucose.slice(0, 500).map(x => ({ id: x.id, value: Number(x.value), context: String(x.context || "Other"), time: String(x.time || ""), date: String(x.date || "") })) : [],
    insulin: Array.isArray(data.insulin) ? data.insulin.slice(0, 500).map(x => ({ id: x.id, dose: Number(x.dose), type: String(x.type || "Other"), time: String(x.time || ""), date: String(x.date || "") })) : [],
    meals: Array.isArray(data.meals) ? data.meals.slice(0, 500).map(x => ({ id: x.id, name: String(x.name || "Meal"), carbs: Number(x.carbs || 0), time: String(x.time || ""), date: String(x.date || "") })) : []
  };
}

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, databaseConfigured: Boolean(MONGO_URI), databaseConnected: mongoose.connection.readyState === 1, aiConfigured: Boolean(client) });
});

app.post("/api/auth/register", authLimiter, async (req, res) => {
  if (!MONGO_URI) return res.status(503).json({ error: "Database is not configured. Add MONGO_URI to .env." });
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || typeof password !== "string") return res.status(400).json({ error: "Name, email and password are required." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const exists = await User.findOne({ email: normalizedEmail }).lean();
    if (exists) return res.status(409).json({ error: "An account with this email already exists." });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash });
    res.status(201).json({ user: publicUser(user), token: issueToken(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create account." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  if (!MONGO_URI) return res.status(503).json({ error: "Database is not configured. Add MONGO_URI to .env." });
  const { email, password } = req.body || {};
  if (!email?.trim() || typeof password !== "string") return res.status(400).json({ error: "Email and password are required." });
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: "Invalid email or password." });
    res.json({ user: publicUser(user), token: issueToken(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to log in." });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.sub).lean();
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: publicUser(user) });
  } catch { res.status(500).json({ error: "Unable to load account." }); }
});

app.get("/api/data", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.sub).select("healthData").lean();
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ data: cleanData(user.healthData) });
  } catch (error) { console.error(error); res.status(500).json({ error: "Unable to load your data." }); }
});

app.put("/api/data", requireAuth, async (req, res) => {
  try {
    const data = cleanData(req.body?.data);
    await User.findByIdAndUpdate(req.auth.sub, { $set: { healthData: data } });
    res.json({ ok: true, data });
  } catch (error) { console.error(error); res.status(500).json({ error: "Unable to sync your data." }); }
});

app.post("/api/ai", requireAuth, async (req, res) => {
  if (!client) return res.status(503).json({ error: "AI is not configured. Add OPENAI_API_KEY to .env on the server." });
  const { message, history = [], data = {} } = req.body || {};
  if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "message is required" });
  const safeContext = cleanData(data);
  const system = `You are Sugr AI, a diabetes health-tracking assistant. Give clear, calm, educational answers. You may summarize patterns in the user's logged data, explain diabetes concepts, and suggest questions to discuss with a clinician. Never diagnose, never tell the user what insulin dose to take, never change medication, and never present a glucose threshold as a personalized treatment instruction. If the user describes severe symptoms or a possible emergency, tell them to follow their emergency plan and seek urgent medical care. Do not claim to be a doctor. Current Sugr data: ${JSON.stringify(safeContext)}`;
  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      instructions: system,
      input: [...history.filter(x => x && (x.role === "user" || x.role === "assistant")).slice(-8).map(x => ({ role: x.role, content: String(x.text || "") })), { role: "user", content: message.trim() }]
    });
    res.json({ reply: response.output_text || "I couldn't generate a response right now." });
  } catch (error) { console.error(error); res.status(500).json({ error: "AI request failed" }); }
});

app.post("/api/meal-ai", requireAuth, async (req, res) => {
  if (!client) return res.status(503).json({ error: "AI is not configured" });
  const { image } = req.body || {};
  if (typeof image !== "string" || !image.startsWith("data:image/")) return res.status(400).json({ error: "image is required" });
  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-6-luna",
      instructions: "You are Sugr AI's meal-photo assistant. Identify visible foods and give a cautious approximate carbohydrate estimate. Never provide insulin dosing. Return JSON with keys title (string), items (array of strings), carbs (number or null), note (string). Make clear that photo-based nutrition estimates can be inaccurate and must be confirmed by the user.",
      input: [{ role: "user", content: [{ type: "input_text", text: "Analyze this meal photo for a tracking estimate." }, { type: "input_image", image_url: image }] }]
    });
    const text = response.output_text || "{}";
    let parsed;
    try { parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")); } catch { parsed = { title: "Meal estimate", items: [text], carbs: null, note: "Please verify this estimate manually before saving." }; }
    res.json(parsed);
  } catch (error) { console.error(error); res.status(500).json({ error: "Meal AI request failed" }); }
});

async function start() {
  if (!MONGO_URI) {
    console.warn("Sugr server started without MONGO_URI. Cloud accounts/sync are disabled.");
  } else {
    await mongoose.connect(MONGO_URI);
    console.log("Sugr database connected");
  }
  app.listen(port, () => console.log(`Sugr API server running on http://localhost:${port}`));
}

start().catch(error => { console.error("Server startup failed:", error); process.exit(1); });
