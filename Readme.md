
# Backend API - WebDev Project

Lightweight Node.js/Express backend for a video/tweets social app (comments, likes, playlists, subscriptions, users, videos). This repository contains controllers, models, routes, middleware, and utilities used by the app.

## Features

- RESTful API endpoints for users, videos, tweets, likes, comments, playlists, and subscriptions
- Authentication middleware and file upload support (multer)
- Cloudinary integration for media storage
- Centralized error and response utilities

## Tech stack

- Node.js + Express
- MongoDB (via a DB adapter in `db/index.js`)
- Cloudinary for media

## Quick start

Requirements:
- Node.js (16+)
- npm or yarn
- MongoDB instance (local or hosted)

1. Install dependencies

```bash
npm install
```

2. Create environment variables

Copy `.env.example` (if present) to `.env` and set values. Common vars used by this project:

- `PORT` — port the server runs on (default: 3000)
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — secret for signing auth tokens
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Cloudinary credentials

3. Run the app

Development (with auto-reload using nodemon if configured):

```bash
npm run dev
```

Production:

```bash
npm start
```

## Project structure (key files)

- `src/index.js` — app entry (Express server)
- `src/app.js` — Express app and middleware setup
- `src/routes/` — route definitions for each resource
- `src/controllers/` — request handlers and business logic
- `src/models/` — Mongoose models / data layer
- `src/middlewares/` — auth, file upload, etc.
- `src/db/index.js` — DB connection
- `src/utils/` — helper utilities (errors, responses, async handler, cloudinary wrapper)

## API overview

Routes are organized by resource under `src/routes`. Example endpoints (adjust prefixes if your router mounts differently):

- `POST /api/users` — create user / register
- `POST /api/auth/login` — login (token issuance)
- `GET /api/videos` — list videos
- `POST /api/videos` — upload/create video (auth + file upload)
- `POST /api/videos/:id/likes` — like a video
- `POST /api/comments` — add comment

Check `src/routes` and `src/controllers` for full route and request/response details.

## Environment & Configuration

Keep secrets out of source control. Use `.env` or your deployment platform's environment settings.

## Tests

If tests exist, run them with:

```bash
npm test
```

(There are no tests included by default in this template — add your test runner and scripts if required.)

## Deployment

Deploy to your platform of choice (Heroku, Railway, Vercel serverless functions, DigitalOcean, etc.). Ensure environment variables are set and MongoDB is reachable from the host.

## Contributing

- Fork the repo
- Create a feature branch
- Open a PR describing your changes

## Troubleshooting

- If the server won't start, confirm `MONGO_URI` is valid and reachable.
- For file upload issues, ensure Cloudinary credentials are correct and `multer` middleware is configured for your routes.

## License

This project does not include a license by default. Add a `LICENSE` file if you wish to open-source it.

---

If you'd like, I can also:

- add an `.env.example` with commonly used variables
- add `package.json` scripts for `dev` and `start` if missing
- generate API route documentation from the code

Tell me which of those you'd like next.
