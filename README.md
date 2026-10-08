# Sugr — Full Stack React + Node + MongoDB + OpenAI

Sugr is a modular React health-tracking application with a Node.js/Express API, MongoDB Atlas cloud storage, JWT authentication, offline-first browser storage, and optional OpenAI-powered features.

## Project structure

```text
Sugr-Full-Stack/
├── src/                    # React frontend
│   ├── components/
│   ├── pages/
│   ├── auth/
│   ├── data/
│   └── utils/
├── backend/
│   ├── server.js           # Express API
│   ├── package.json
│   └── .env.example
├── package.json
├── vite.config.js
└── README.md
```

## 1. Install

From the project root:

```bash
npm install
```

The root package contains the frontend and server dependencies.

## 2. Configure the backend

Create:

```text
backend/.env
```

Copy the values from `backend/.env.example` and replace the placeholders.

Never paste your real OpenAI key or MongoDB password into source code or Git.

## 3. Start everything

From the project root:

```bash
npm start
```

This starts:

- Vite frontend at `http://localhost:5173`
- Sugr API at `http://localhost:3001`

You can also start them separately:

```bash
npm run dev
```

and in another terminal:

```bash
npm run server
```

## 4. Test the backend

Open:

```text
http://localhost:3001/api/health
```

You should receive JSON showing whether MongoDB and AI are configured.

## API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/data`
- `PUT /api/data`
- `POST /api/ai`
- `POST /api/meal-ai`
- `GET /api/health`

## Security

- Passwords are hashed with bcrypt.
- Login uses JWT.
- Health data routes require authentication.
- AI keys stay on the backend.
- Rate limiting, Helmet and CORS are enabled.
- Meal-photo carbohydrate estimates must be confirmed before logging.
- Sugr AI does not diagnose, prescribe medication, or calculate insulin doses.

## Important

If an OpenAI API key has ever been exposed, revoke it and create a new one before putting a replacement in `backend/.env`.
