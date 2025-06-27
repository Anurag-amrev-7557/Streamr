# Streamr: Ultimate Streaming Platform

A modern full-stack streaming platform with social features, built with React (Vite) frontend and Express/MongoDB backend.

---

## Monorepo Structure

```
Streamr/
  frontend/   # Vite + React + Tailwind (client)
  backend/    # Express + MongoDB + Socket.IO (server)
```

---

## 1. Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (v9+ recommended)
- **MongoDB** (local or Atlas)
- (Optional) **Redis** for queueing (BullMQ)

---

## 2. Cloning & Installing

```bash
git clone https://github.com/your-username/streamr.git
cd streamr

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

---

## 3. Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in `backend/`:
```
MONGODB_URI=mongodb://localhost:27017/streamr
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
TMDB_API_KEY=your_tmdb_api_key
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
REDIS_URL=redis://localhost:6379 # (optional, for BullMQ)
```

### Frontend (`frontend/.env`)
Create a `.env` file in `frontend/`:
```
VITE_API_URL=http://localhost:3001/api
```

---

## 4. Running Locally

### Start Backend
```bash
cd backend
npm run dev
# or: npm start
```
- Runs on [http://localhost:3001](http://localhost:3001)

### Start Frontend
```bash
cd frontend
npm run dev
```
- Runs on [http://localhost:5173](http://localhost:5173)

---

## 5. Scripts & Useful Commands

### Frontend
- `npm run dev` – Start Vite dev server
- `npm run build` – Build for production
- `npm run preview` – Preview production build
- `npm run lint` – Lint code

### Backend
- `npm run dev` – Start with nodemon
- `npm start` – Start normally
- `npm test` – Run backend tests

---

## 6. Deployment

### GitHub
- Push both `frontend/` and `backend/` folders to your repo.
- Use GitHub Actions for CI/CD (optional, see below).

### Production
- **Frontend:** Deploy `frontend/dist` to Vercel, Netlify, or any static host.
- **Backend:** Deploy `backend` to a Node.js server (Heroku, Render, DigitalOcean, etc.).
- Set environment variables in your host's dashboard.
- Point frontend API URL to your backend (update `VITE_API_URL`).

### PWA/Manifest
- The frontend is PWA-ready (see `public/site.webmanifest`).
- Update icons and manifest as needed.

---

## 7. Best Practices & Tips
- Use strong secrets in production.
- Enable HTTPS in production.
- Regularly run `npm audit` and update dependencies.
- Monitor logs (`backend/logs/`).
- Use Sentry or similar for error tracking.
- Use `.env.example` files for onboarding new devs.
- Add tests for critical backend routes.
- Use GitHub branch protection and PR reviews.

---

## 8. Contributing
- Fork, branch, and PR as usual.
- Use conventional commits.
- Run linter and tests before PR.

---

## 9. License
MIT

---

## 10. Credits
- [TMDB API](https://www.themoviedb.org/documentation/api)
- [Vite](https://vitejs.dev/), [React](https://react.dev/), [Tailwind](https://tailwindcss.com/)
- [Express](https://expressjs.com/), [MongoDB](https://www.mongodb.com/), [Socket.IO](https://socket.io/) 