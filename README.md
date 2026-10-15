# College Lost & Found

A full-stack college lost-and-found app built with React + Vite, Express, MongoDB Atlas, Mongoose, JWT, bcrypt, and Cloudinary.

## Features
- Student registration and login
- Admin login using a securely seeded admin account
- Create lost/found reports with an image, place, date, and description
- Browse and search listings
- Claim available found items
- Students can see their own reports and claims
- Admin can review claims, change claim status, and mark items returned
- Role-protected API routes

## Requirements
- Node.js 18+
- MongoDB Atlas account
- Cloudinary account

## 1. Configure the backend

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and fill in your values:

```env
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/lost_found?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

ADMIN_NAME=College Admin
ADMIN_EMAIL=admin@college.edu
ADMIN_PASSWORD=replace-with-a-strong-password
```

Use the exact database username/password from MongoDB Atlas. If the password contains special characters, URL-encode them. In Atlas, create a database user, allow your development IP under Network Access, and copy the connection string from Connect > Drivers.

Cloudinary credentials are available in the Cloudinary dashboard. Keep secrets in `.env`; never put them in frontend variables.

Start the backend:

```bash
npm run dev
```

On startup, the server connects to MongoDB and creates or updates the admin account from the `ADMIN_*` environment variables.

## 2. Configure the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env` from `.env.example` (the default `/api` works with Vite's dev proxy).

```env
VITE_API_URL=/api
```

Start Vite:

```bash
npm run dev
```

Open the URL shown by Vite, usually http://localhost:5173.

## Login
- Students: use **Register** to create an account.
- Admin: use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` set in `backend/.env`.
- Admin registration is not exposed publicly.

## API overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/items`
- `GET /api/items/mine` (student/admin)
- `POST /api/items` (authenticated; multipart form field `image`)
- `GET /api/claims/mine`
- `POST /api/claims/:itemId`
- `GET /api/claims` (admin)
- `PATCH /api/claims/:claimId` (admin)
- `PATCH /api/items/:itemId/status` (admin)

## Important notes
- This is a college project starter. Before public deployment, add email verification, rate limiting, logging, stricter college-email-domain validation, and a privacy/retention policy.
- Claims are requests, not automatic ownership verification. Admins should verify claimants before handing over belongings.
- For production, configure your deployment's frontend origin in `CLIENT_ORIGIN`, use HTTPS, and use a strong unique JWT secret.
