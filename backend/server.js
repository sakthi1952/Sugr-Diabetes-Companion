import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import OpenAI from "openai";

// Load backend/.env
dotenv.config({
  path: new URL(".env", import.meta.url)
});

const app = express();
const port = Number(process.env.PORT || 3001);

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/free";

// --------------------------------------------------
// OPENROUTER CLIENT
// --------------------------------------------------

const aiClient = OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Sugr Diabetes Management App"
      }
    })
  : null;

// --------------------------------------------------
// EXPRESS CONFIGURATION
// --------------------------------------------------

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(express.json({ limit: "10mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api", apiLimiter);

// --------------------------------------------------
// MONGODB SCHEMAS
// --------------------------------------------------

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const healthDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    glucose: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    insulin: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    meals: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);
const HealthData = mongoose.model("HealthData", healthDataSchema);

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --------------------------------------------------
// AUTH MIDDLEWARE
// --------------------------------------------------

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required."
      });
    }

    const token = header.slice(7);

    const decoded = jwt.verify(token, JWT_SECRET);

    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired authentication token."
    });
  }
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    databaseConfigured: Boolean(MONGO_URI),
    databaseConnected: mongoose.connection.readyState === 1,
    aiConfigured: Boolean(aiClient),
    aiProvider: "OpenRouter",
    aiModel: OPENROUTER_MODEL
  });
});

// --------------------------------------------------
// REGISTER
// --------------------------------------------------

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email and password are required."
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: "Please enter a valid email address."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must contain at least 6 characters."
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash
    });

    await HealthData.create({
      userId: user._id,
      glucose: [],
      insulin: [],
      meals: []
    });

    const token = createToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      error: "Unable to create account."
    });
  }
});

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required."
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      error: "Unable to login."
    });
  }
});

// --------------------------------------------------
// CURRENT USER
// --------------------------------------------------

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "_id name email createdAt"
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found."
      });
    }

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Auth/me error:", error);

    res.status(500).json({
      error: "Unable to load user."
    });
  }
});

// --------------------------------------------------
// GET HEALTH DATA
// --------------------------------------------------

app.get("/api/data", requireAuth, async (req, res) => {
  try {
    let data = await HealthData.findOne({
      userId: req.userId
    }).lean();

    if (!data) {
      data = {
        glucose: [],
        insulin: [],
        meals: []
      };

      await HealthData.create({
        userId: req.userId,
        glucose: [],
        insulin: [],
        meals: []
      });
    }

    res.json({
      glucose: data.glucose || [],
      insulin: data.insulin || [],
      meals: data.meals || []
    });
  } catch (error) {
    console.error("GET data error:", error);

    res.status(500).json({
      error: "Unable to load health data."
    });
  }
});

// --------------------------------------------------
// SAVE / SYNC HEALTH DATA
// --------------------------------------------------

app.put("/api/data", requireAuth, async (req, res) => {
  try {
    const glucose = Array.isArray(req.body.glucose)
      ? req.body.glucose
      : [];

    const insulin = Array.isArray(req.body.insulin)
      ? req.body.insulin
      : [];

    const meals = Array.isArray(req.body.meals)
      ? req.body.meals
      : [];

    const data = await HealthData.findOneAndUpdate(
      {
        userId: req.userId
      },
      {
        $set: {
          glucose,
          insulin,
          meals
        }
      },
      {
        new: true,
        upsert: true
      }
    ).lean();

    res.json({
      ok: true,
      data: {
        glucose: data.glucose || [],
        insulin: data.insulin || [],
        meals: data.meals || []
      }
    });
  } catch (error) {
    console.error("PUT data error:", error);

    res.status(500).json({
      error: "Unable to save health data."
    });
  }
});

// --------------------------------------------------
// AI SAFETY SYSTEM PROMPT
// --------------------------------------------------

const AI_SYSTEM_PROMPT = `
You are Sugr AI, an educational assistant inside the Sugr diabetes
tracking application.

Your job is to help users understand their logged glucose, meal and
insulin data in simple language.

IMPORTANT SAFETY RULES:

1. Do not diagnose medical conditions.
2. Do not prescribe medication.
3. Do not recommend changing medication.
4. Do not calculate, recommend, or adjust insulin doses.
5. Do not tell the user how many insulin units to take.
6. Do not replace a doctor or healthcare professional.
7. You may identify patterns and associations in the user's logged data.
8. Clearly distinguish correlation or association from causation.
9. If the user reports severe symptoms or a medical emergency, advise
   them to seek appropriate urgent medical care.
10. Be concise, supportive and easy to understand.
11. Use the user's provided data when relevant.
12. Never invent glucose readings, meals, insulin entries or other data.

You can help with:
- understanding logged glucose patterns
- understanding meal/carbohydrate relationships
- organizing health information
- preparing questions for a clinician
- explaining diabetes-related concepts generally
- summarizing user-entered information

This is a tracking and educational tool, not a medical device.
`;

// --------------------------------------------------
// AI RESPONSE HELPER
// --------------------------------------------------

async function askAI(messages, options = {}) {
  if (!aiClient) {
    const error = new Error(
      "AI is not configured. Add OPENROUTER_API_KEY to backend/.env."
    );

    error.status = 503;
    throw error;
  }

  const model = options.model || OPENROUTER_MODEL;

  const response = await aiClient.chat.completions.create({
    model,
    messages,
    temperature: 0.3,
    max_tokens: options.maxTokens || 700
  });

  const reply =
    response?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("OpenRouter returned an empty AI response.");
  }

  return reply;
}

// --------------------------------------------------
// PERSONAL AI ASSISTANT
// --------------------------------------------------

app.post("/api/ai", requireAuth, async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(503).json({
        error:
          "AI is not configured. Add OPENROUTER_API_KEY to backend/.env."
      });
    }

    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({
        error: "AI message is required."
      });
    }

    const history = Array.isArray(req.body.history)
      ? req.body.history.slice(-8)
      : [];

    const data = req.body.data || {};

    const safeData = {
      glucose: Array.isArray(data.glucose)
        ? data.glucose.slice(0, 30)
        : [],

      insulin: Array.isArray(data.insulin)
        ? data.insulin.slice(0, 30)
        : [],

      meals: Array.isArray(data.meals)
        ? data.meals.slice(0, 30)
        : []
    };

    const messages = [
      {
        role: "system",
        content: AI_SYSTEM_PROMPT
      },

      {
        role: "system",
        content: `
Here is the user's recent Sugr tracking data.

GLUCOSE:
${JSON.stringify(safeData.glucose)}

INSULIN LOGS:
${JSON.stringify(safeData.insulin)}

MEALS:
${JSON.stringify(safeData.meals)}

Use only this information when discussing the user's personal
tracking history.
`
      },

      ...history
        .filter(
          (item) =>
            item &&
            (item.role === "user" || item.role === "assistant")
        )
        .map((item) => ({
          role: item.role,
          content: String(item.text || item.content || "")
        })),

      {
        role: "user",
        content: message
      }
    ];

    const reply = await askAI(messages);

    res.json({
      reply,
      provider: "OpenRouter",
      model: OPENROUTER_MODEL
    });
  } catch (error) {
    console.error("AI request error:", {
      message: error.message,
      code: error.code,
      status: error.status
    });

    const status =
      error.status ||
      (error.code === "insufficient_quota" ? 402 : 500);

    res.status(status).json({
      error:
        error.message ||
        "AI request failed."
    });
  }
});

// --------------------------------------------------
// AI MEAL SCANNER
// --------------------------------------------------

app.post("/api/meal-ai", requireAuth, async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(503).json({
        error:
          "AI is not configured. Add OPENROUTER_API_KEY to backend/.env."
      });
    }

    const image = String(req.body.image || "").trim();

    if (!image) {
      return res.status(400).json({
        error: "Meal image is required."
      });
    }

    /*
      The frontend sends a data URL such as:

      data:image/jpeg;base64,...

      OpenRouter/OpenAI-compatible vision requests can receive
      the data URL directly as an image_url.
    */

    const messages = [
      {
        role: "system",
        content: `
You are Sugr Meal Scanner.

Analyze the uploaded food image for educational food logging.

Return ONLY valid JSON in this exact structure:

{
  "title": "short meal name",
  "items": [
    "food item 1",
    "food item 2"
  ],
  "carbs": 0,
  "note": "short explanation"
}

Rules:
- Estimate carbohydrates only.
- Do not provide insulin doses.
- Do not recommend medication.
- Do not diagnose.
- If the image is unclear, say so in "note".
- Carbohydrate estimates are approximate and must be confirmed by the user.
- Do not invent foods that cannot reasonably be seen.
`
      },

      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this meal photo and estimate its carbohydrates."
          },
          {
            type: "image_url",
            image_url: {
              url: image
            }
          }
        ]
      }
    ];

    const response = await aiClient.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 500
    });

    let content =
      response?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error(
        "OpenRouter returned an empty meal analysis."
      );
    }

    // Remove markdown code fences if the model returns them.
    content = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;

    try {
      result = JSON.parse(content);
    } catch {
      result = {
        title: "Meal analysis",
        items: [],
        carbs: null,
        note:
          "The AI returned an unexpected format. Please confirm the meal manually."
      };
    }

    res.json(result);
  } catch (error) {
    console.error("Meal AI error:", {
      message: error.message,
      code: error.code,
      status: error.status
    });

    res.status(error.status || 500).json({
      error:
        error.message ||
        "Meal AI request failed."
    });
  }
});

// --------------------------------------------------
// DELETE HEALTH DATA
// --------------------------------------------------

app.delete("/api/data", requireAuth, async (req, res) => {
  try {
    await HealthData.findOneAndUpdate(
      {
        userId: req.userId
      },
      {
        $set: {
          glucose: [],
          insulin: [],
          meals: []
        }
      }
    );

    res.json({
      ok: true,
      message: "Health data deleted."
    });
  } catch (error) {
    console.error("Delete data error:", error);

    res.status(500).json({
      error: "Unable to delete health data."
    });
  }
});

// --------------------------------------------------
// DELETE ACCOUNT
// --------------------------------------------------

app.delete("/api/auth/account", requireAuth, async (req, res) => {
  try {
    await HealthData.deleteOne({
      userId: req.userId
    });

    await User.deleteOne({
      _id: req.userId
    });

    res.json({
      ok: true,
      message: "Account deleted."
    });
  } catch (error) {
    console.error("Delete account error:", error);

    res.status(500).json({
      error: "Unable to delete account."
    });
  }
});

// --------------------------------------------------
// 404 HANDLER
// --------------------------------------------------

app.use("/api", (_req, res) => {
  res.status(404).json({
    error: "API endpoint not found."
  });
});

// --------------------------------------------------
// GENERAL ERROR HANDLER
// --------------------------------------------------

app.use((error, _req, res, _next) => {
  console.error("Server error:", error);

  res.status(500).json({
    error: "Internal server error."
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

async function start() {
  app.listen(port, "0.0.0.0", () => {
    console.log(
      `Sugr API server running on http://localhost:${port}`
    );

    console.log(
      `AI provider: ${
        aiClient ? "OpenRouter configured" : "NOT CONFIGURED"
      }`
    );

    console.log(
      `AI model: ${OPENROUTER_MODEL}`
    );
  });

  if (!MONGO_URI) {
    console.warn(
      "MONGO_URI is missing. MongoDB/cloud storage is disabled."
    );

    return;
  }

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });

    console.log("Sugr database connected");
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    console.warn(
      "Sugr API is still running, but cloud database features are unavailable."
    );
  }
}

start();