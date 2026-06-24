# Deployment Guide: Batra Booking System

This guide outlines the steps to deploy the **Batra Booking System** (MERN Stack) to production. We will use:
- **MongoDB Atlas** for the hosted database.
- **Render** (or Railway) for the Node.js/Express backend.
- **Vercel** (or Netlify/Render) for the React/Vite frontend.

---

## Step 1: Set Up MongoDB Atlas (Database)

1. Sign up/Log in at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new **Free Shared Cluster**.
3. Under **Security -> Database Access**, create a user (e.g. `batra_admin`) with a strong password. Note this password down.
4. Under **Network Access**, click **Add IP Address** and choose **Allow Access from Anywhere** (`0.0.0.0/0`). This is necessary since hosting providers like Render use dynamic IPs.
5. Go to your cluster, click **Connect** -> **Drivers**, and copy the **Connection String** (URI).
   - *Example URI format:* `mongodb+srv://batra_admin:<password>@cluster0.xxxx.mongodb.net/batra_booking?retryWrites=true&w=majority`

---

## Step 2: Deploy the Backend on Render

1. Sign up/Log in at [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository (`drop-afk/batracomputers`).
4. Configure the Web Service:
   - **Name:** `batra-booking-backend`
   - **Language:** `Node`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js` (or `npm start`)
5. Click **Advanced** and add the following **Environment Variables**:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: *Your MongoDB connection string from Step 1 (make sure to replace `<password>` with your actual password).*
   - `JWT_SECRET`: *A secure random string (e.g. 32+ characters).*
   - `JWT_EXPIRE`: `7d`
   - `FRONTEND_URL`: *We will update this in Step 4 with your deployed frontend URL.*
6. Click **Create Web Service**. It will deploy, and Render will provide you with a backend URL (e.g., `https://batra-booking-backend.onrender.com`). Note this down!

## Step 3: Deploy the Frontend (Vercel, Netlify, or Render)

You can choose one of the following platforms to host your frontend:

### Option A: Vercel (Recommended)
1. Sign up/Log in at [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository (`drop-afk/batracomputers`).
4. Configure the Vercel Project:
   - **Root Directory:** Edit this and select the `frontend` folder.
   - **Framework Preset:** `Vite` (Vercel will auto-detect this).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand the **Environment Variables** section and add:
   - `VITE_API_URL`: *Your Render backend URL from Step 2 (e.g., `https://batra-booking-backend.onrender.com` — do NOT include a trailing slash).*
6. Click **Deploy**.

### Option B: Netlify (Alternative)
1. Sign up/Log in at [Netlify](https://www.netlify.com/).
2. Click **Add new site** -> **Import an existing project**.
3. Connect your GitHub and select `drop-afk/batracomputers`.
4. Configure the Build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist` (or `dist`)
5. Under **Environment variables**, add:
   - `VITE_API_URL`: *Your Render backend URL from Step 2.*
6. Click **Deploy**.
7. *SPA Route Fix:* To make routing work on reload on Netlify, create a file named `_redirects` inside `frontend/public` containing: `/* /index.html 200`.

### Option C: Render Static Site (Keep everything on Render)
1. In your [Render](https://render.com/) dashboard, click **New +** and select **Static Site**.
2. Connect your GitHub repository.
3. Configure the Static Site:
   - **Name:** `batra-booking-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
4. Under **Environment**, add:
   - `VITE_API_URL`: *Your Render backend URL from Step 2.*
5. Under **Redirects/Rewrites** in the sidebar settings, add a rule:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** `Rewrite` (This ensures React routing works on page refresh).
6. Save and deploy.


---

## Step 4: Finalize Configuration

1. Copy your Vercel URL (e.g. `https://batra-booking.vercel.app`).
2. Go back to your **Render Backend Web Service dashboard -> Settings -> Environment**.
3. Update the `FRONTEND_URL` variable to your Vercel URL.
4. Save changes. Render will automatically redeploy the backend with the updated CORS configuration.

---

## Step 5: Seed the Production Database (Optional)

To initialize the default owner account (`owner@batra.com`) and default services in your new cloud database:

1. On your local machine, temporarily change the `MONGODB_URI` in `backend/.env` to the production MongoDB Atlas connection string.
2. Run the database seed script:
   ```bash
   cd backend
   npm run seed
   ```
3. Once completed successfully, change your local `MONGODB_URI` back to your local database URI (`mongodb://localhost:27017/...`).
