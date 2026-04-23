# 🌍 AI Trip Planner

A modern, full-stack Monorepo application built to help users seamlessly plan their travels. Users can input destinations, budgets, timelines, and specialized preferences to receive personalized, AI-driven itinerary suggestions based on their input.

## 🚀 Built With
- **Frontend**: React (Vite), React Router v6, Axios
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Deployment & Hosting**: Vercel Serverless Functions

## ✨ Features
- **Smart Planning**: Create new trip plans dynamically tracking destination, budget (₹), and dates.
- **AI Tiers**: The system calculates a budget-aware logic tier (Budget, Standard, Premium, Luxury) and drafts curated travel advice.
- **My Trips Dashboard**: Track, fetch, and review all previous trips from the database in an intuitive card layout.
- **Vercel-Ready**: Fully configured to safely run serverless `get` and `post` request streams without risking local timeout barriers.

## 📂 Project Structure
This repository applies strict isolation for robust microservice deployment:
```bash
/
├── backend/                  # Server-side API files
│   ├── api/index.js          # Main Express Serverless export point
│   ├── models/Trip.js        # Mongoose database models
│   └── package.json          
├── frontend/                 # Client-side React files
│   ├── src/                  
│   ├── vite.config.js        # Handles local API proxying 
│   └── package.json          
└── vercel.json               # Critical routing instructions for Vercel
```

## 🔐 Environment Variables
To securely run this project locally or in the cloud, you will need to map a MongoDB Atlas cluster.
Add this inside your Vercel Dashboard OR via a `.env` file referencing the backend environment.
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ai-trip-planner
```
*(If deploying to Vercel, ensure your Atlas Network Access is whitelisted to `0.0.0.0/0`)*

## 🛠️ Local Development

### Option 1: Native Local (Recommended)
You can test the exact Vercel Serverless routing emulation directly via the Vercel CLI.
```bash
# Install the Vercel CLI globally
npm i -g vercel

# From the root directory, bind to the proxy
vercel dev
```

### Option 2: Split Terminal Mode
**1. Boot the Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**2. Boot the API Layer (separate terminal):**
```bash
cd backend
npm install
node api/index.js
```

## 🌐 Production Deployment
This repository is pre-configured with a custom `vercel.json` built specifically to circumvent modern Mono-repo dist/output routing issues.

It leverages Vercel's legacy **v2 Builds Workflow** to simultaneously:
- Render `@vercel/static-build` against the `frontend` payload.
- Compile and sandbox `@vercel/node` within `backend/api`.
- Explicitly map `/assets/*` and wildcards toward `/frontend/dist/` minimizing 404 occurrences.
