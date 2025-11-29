# Streamr Backend API

Backend API server for Streamr Netflix Clone with authentication and user management.

## Features

- 🔐 Email/Password Authentication
- 🌐 Google OAuth 2.0
- 🔑 JWT Token-based Auth
- 🗄️ MongoDB Database
- 🛡️ Protected Routes
- 📝 Input Validation

## Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Variables**
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Required variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `FRONTEND_URL` - Frontend application URL

3. **MongoDB Setup**
- Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a new cluster
- Get your connection string
- Add it to `.env` as `MONGODB_URI`

4. **Google OAuth Setup**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project
- Enable Google+ API
- Create OAuth 2.0 credentials
- Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
- Add credentials to `.env`

5. **Run Server**
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user (Protected)
- `POST /api/auth/logout` - Logout user (Protected)
- `PUT /api/auth/mylist` - Update user's watchlist (Protected)

### Health Check
- `GET /health` - Server health status

## Tech Stack

- Express.js
- MongoDB + Mongoose
- Passport.js (Google OAuth)
- JWT (jsonwebtoken)
- bcryptjs (Password hashing)

## Security Features

- Password hashing with bcrypt
- HTTP-only cookies
- CORS protection
- Input validation
- JWT token expiration
- Secure session management
