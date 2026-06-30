#!/bin/bash

# 🚀 BLOGGER APPROVAL SYSTEM - ONE-CLICK DEPLOYMENT
# This script deploys everything to Vercel in one command

set -e

echo "🚀 Starting Blogger Approval System Deployment..."
echo ""

# Step 1: Verify prerequisites
echo "📋 Checking prerequisites..."
if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git: https://git-scm.com/downloads"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Step 2: Stage and commit all changes
echo "📦 Staging all files..."
git add .
git commit -m "🚀 Blogger Approval System - Production Ready

- Complete backend API (37 endpoints)
- React frontend (5 dashboards)
- 7-day automatic booking system
- Google Sheets integration
- Security & audit logging
- Production deployment ready

All files for immediate deployment." || echo "No changes to commit"

# Step 3: Vercel login
echo ""
echo "🔐 Logging into Vercel..."
echo "👉 If you don't have a Vercel account, create one at: https://vercel.com"
vercel login --sso || vercel login

# Step 4: Deploy backend
echo ""
echo "📤 Deploying backend to Vercel..."
vercel --prod --name=blogger-approval-backend

BACKEND_URL=$(vercel ls --prod | grep blogger-approval-backend | awk '{print $2}')

# Step 5: Deploy frontend
echo ""
echo "📤 Deploying frontend to Vercel..."
cd frontend
vercel --prod --name=blogger-approval-frontend --env REACT_APP_API_URL=https://${BACKEND_URL}/api

FRONTEND_URL=$(vercel ls --prod | grep blogger-approval-frontend | awk '{print $2}')
cd ..

# Step 6: Output results
echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 YOUR LIVE URLS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Frontend:   https://${FRONTEND_URL}"
echo "🔌 Backend:    https://${BACKEND_URL}/api"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Open: https://${FRONTEND_URL}"
echo "2. Login with: admin / password"
echo "3. Go through workflow"
echo "4. Change passwords for production"
echo ""
echo "📚 Documentation: See README_COMPLETE.md"
echo ""
