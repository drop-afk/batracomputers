# Batra Computer Booking System

A full-stack web application for managing cyber cafe services including photocopying, printing, homework help, and ticket booking. Built for Batra Computers in Rohtak, Haryana, India.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router DOM + Axios
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Authentication:** JWT + bcryptjs

## Features

### For Customers
- Browse services (Photocopy, Printing, Homework Help, Ticket Booking)
- Book services with real-time price calculation
- View booking status and assigned worker details
- Rate workers after completion (1-5 stars)
- WhatsApp integration for worker contact

### For Workers
- Dashboard with pending requests, active tasks, and performance stats
- One-click accept & assign bookings
- Update task status (Accepted → In Progress → Completed)
- View customer contact with WhatsApp link
- Track completed tasks and ratings

### For Admin/Owner
- Analytics dashboard (bookings today/week/month, popular services, worker stats)
- Service management (add/edit/deactivate services)
- Worker management (add workers, toggle active status)
- Full booking oversight

## Project Structure

```
batra-booking-system/
├── backend/
│   ├── models/          # MongoDB schemas (User, Service, Booking)
│   ├── routes/           # API endpoints (auth, services, bookings, users, analytics)
│   ├── middleware/       # Auth middleware & role authorization
│   ├── scripts/          # Seed script for demo data
│   ├── server.js         # Express server entry point
│   └── .env.example      # Environment variables template
│
└── frontend/
    ├── src/
    │   ├── components/   # Navbar, ProtectedRoute
    │   ├── contexts/     # AuthContext (JWT state management)
    │   ├── pages/        # All page components
    │   ├── utils/        # API client (axios), helper functions
    │   ├── App.jsx       # Route configuration
    │   ├── main.jsx      # Entry point
    │   └── index.css     # Tailwind directives + custom styles
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

## Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas cloud)

### 1. Backend Setup

```bash
cd backend

# Create .env file from template
cp .env.example .env

# Install dependencies
npm install

# Seed demo data (optional - creates owner, 2 workers, 12 services, 4 sample bookings)
npm run seed

# Start development server
npm run dev
```

Backend runs on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:3000` (proxies API calls to backend)

### Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Owner | `owner@batracomputers.com` | `admin123` |
| Worker | `amit@batracomputers.com` | `worker123` |
| Worker | `priya@batracomputers.com` | `worker123` |

## Environment Variables

Create `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/batra_booking
# Or MongoDB Atlas: mongodb+srv://user:password@cluster.mongodb.net/batra_booking

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
```

## API Endpoints

### Auth
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Services
- `GET /services` - List all active services
- `POST /services` - Add service (admin)
- `PUT /services/:id` - Update service (admin)
- `DELETE /services/:id` - Deactivate service (admin)

### Bookings
- `POST /bookings` - Create booking (public)
- `GET /bookings/customer/:customerId` - My bookings
- `GET /bookings/pending` - All pending (worker/admin)
- `GET /bookings/worker/:workerId` - Worker's tasks
- `GET /bookings/:id` - Booking details
- `PATCH /bookings/:id/accept` - Accept & assign to self
- `PATCH /bookings/:id/status` - Update status
- `PATCH /bookings/:id/rating` - Leave rating
- `PATCH /bookings/:id/final-cost` - Set final cost

### Users
- `GET /users/workers` - List workers (admin)
- `POST /users/workers` - Add worker (admin)
- `GET /users/:id` - Get user details
- `PATCH /users/:id` - Update profile

### Analytics
- `GET /analytics/dashboard` - Admin dashboard stats
- `GET /analytics/worker/:workerId` - Worker performance stats

## Frontend Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | Home (services listing) | Public |
| `/booking` | Booking form | Public |
| `/booking/:serviceId` | Booking with pre-selected service | Public |
| `/my-bookings` | Customer's bookings | Customer |
| `/login` | Login | Public (redirects if authenticated) |
| `/signup` | Signup | Public (redirects if authenticated) |
| `/dashboard` | Worker dashboard | Worker/Admin |
| `/dashboard/pending` | All pending requests | Worker/Admin |
| `/dashboard/my-tasks` | Worker's tasks | Worker/Admin |
| `/admin` | Admin panel | Admin only |

## Deployment

### Backend (Render/Railway/Heroku)
1. Set environment variables in dashboard
2. Set `NODE_ENV=production`
3. Connect to MongoDB Atlas

### Frontend (Vercel/Netlify)
1. Build command: `npm run build`
2. Output directory: `dist`
3. Add proxy/rewrite rules to forward API calls to backend URL
4. Update `frontend/src/utils/api.js` baseURL to production backend URL

### MongoDB Atlas
1. Create free cluster
2. Whitelist all IPs (0.0.0.0/0) or your server IP
3. Get connection string and set as `MONGODB_URI`

## Security Features
- Passwords hashed with bcrypt (10 rounds)
- JWT authentication with Bearer tokens
- Role-based access control (customer, worker, owner)
- Rate limiting on auth endpoints (20 requests per 15 min)
- Input validation with express-validator
- CORS enabled

## Testing Checklist
- [x] Customer can browse services and book
- [x] Worker can see pending requests and accept
- [x] Customer sees assigned worker info with WhatsApp link
- [x] Worker can update task status through workflow
- [x] Status updates reflect in real-time (polling)
- [x] Customer can rate completed bookings
- [x] Price auto-calculates based on service + quantity
- [x] Admin can manage services and workers
- [x] Admin analytics dashboard shows stats
- [x] Form validation works on all inputs
- [x] Mobile responsive design
- [x] Role-based route protection

## License
MIT
