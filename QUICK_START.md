# 🚀 QUICK START - Deploy in 30 Minutes

## For Impatient People Who Want It Running NOW

---

## ⚡ 5-Minute Vercel Deployment

### Prerequisites
- GitHub account
- Vercel account (free)
- Node.js 18+ locally (optional)

### Deploy Backend

```bash
# 1. Clone/push to GitHub
git clone <your-repo>
cd blogger-approval-backend
git add .
git commit -m "Deploy"
git push origin main

# 2. Login to vercel.com
# 3. Import GitHub repository
# 4. Add environment variables:
DATABASE_URL=postgresql://...  # Get from Vercel Postgres
JWT_SECRET=your-random-32-char-secret
JWT_REFRESH_SECRET=your-random-32-char-secret
GOOGLE_SHEETS_ID=
GOOGLE_SHEETS_CREDENTIALS=
NODE_ENV=production

# 5. Click "Deploy"
# ✅ Backend live at: https://blogger-approval-backend.vercel.app
```

### Deploy Frontend

```bash
# 1. Go to frontend directory
cd frontend

# 2. Import same GitHub repo with different root: frontend/
# 3. Add environment variable:
REACT_APP_API_URL=https://blogger-approval-backend.vercel.app/api

# 4. Click "Deploy"
# ✅ Frontend live at: https://blogger-approval-frontend.vercel.app
```

---

## 🗄️ Database Setup (2 Minutes)

### Create Vercel Postgres Database

1. Go to Vercel Dashboard → Your Project
2. Click "Storage" tab
3. Create → Postgres
4. Copy `DATABASE_URL` to backend environment variables
5. Click "Console" → Run SQL:

```sql
-- Copy entire contents of src/database/schema.sql
-- Paste into console
-- Run

-- Then seed demo data:
-- Copy entire contents of src/database/seed.sql
-- Paste into console
-- Run
```

✅ Database ready

---

## ✅ Verification (2 Minutes)

### Test Backend

```bash
curl https://your-backend.vercel.app/api/health
# Should return: {"status":"OK"}

curl -X POST https://your-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
# Should return: {"success":true,"data":{"accessToken":"...","user":{"id":"...","role":"admin"}}}
```

### Test Frontend

Open in browser: `https://your-frontend.vercel.app`

Login with:
- Username: `admin`
- Password: `password`

You should see admin dashboard

✅ System working!

---

## 🎯 Key URLs

- **Backend API**: `https://your-backend.vercel.app/api`
- **Frontend**: `https://your-frontend.vercel.app`
- **API Docs**: See `API_DOCUMENTATION.md`
- **Admin User**: admin/password

---

## 📝 Demo Credentials

All work on production after deployment:

```
Admin:        admin / password
Staff:        staff1 / password
Checking:     checking1 / password
Finance:      finance1 / password
Team Leader:  teamlead1 / password
```

Change these passwords immediately after deployment!

---

## 🧪 Test the Core System (5 Minutes)

### 1. Submit Application (as Staff)

```bash
TOKEN=$(curl -s -X POST https://your-backend/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"staff1","password":"password"}' \
  | jq -r '.data.accessToken')

curl -X POST https://your-backend/api/applications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bloggerId":"blogger-1",
    "budget":50000
  }'

# Response: {"success":true,"data":{"applicationId":"app-xxx"}}
```

### 2. Approve by Checking

```bash
TOKEN=$(curl -s -X POST https://your-backend/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"checking1","password":"password"}' \
  | jq -r '.data.accessToken')

curl -X POST https://your-backend/api/applications/app-xxx/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"remarks":"Looks good"}'
```

### 3. Approve by Finance (Creates 7-Day Booking!)

```bash
TOKEN=$(curl -s -X POST https://your-backend/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"finance1","password":"password"}' \
  | jq -r '.data.accessToken')

curl -X POST https://your-backend/api/applications/app-xxx/finance-approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedBudget":50000,
    "remarks":"Approved"
  }'

# This creates automatic 7-day booking! Check:
curl -X GET https://your-backend/api/bookings \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Verify Booking Block

Try to submit another application for same blogger as a different staff member:

```bash
TOKEN=$(curl -s -X POST https://your-backend/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"staff2","password":"password"}' \
  | jq -r '.data.accessToken')

curl -X POST https://your-backend/api/applications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bloggerId":"blogger-1",
    "budget":40000
  }'

# Expected error: 
# {"success":false,"error":{"code":"BOOKING_BLOCKED","message":"Blogger is booked by staff1 until..."}}
```

✅ The 7-day booking block is working!

---

## 🐳 Alternative: Docker Deployment (5 Minutes)

```bash
cd blogger-approval-backend

# Create .env.docker file
cat > .env.docker << EOF
DATABASE_URL=postgresql://postgres:postgres@db:5432/blogger_approval
JWT_SECRET=dev-secret-key-min-32-chars-long
JWT_REFRESH_SECRET=dev-refresh-secret-min-32-chars-long
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3001
EOF

# Run
docker-compose up -d

# Wait 30 seconds for database to start
sleep 30

# Run migrations
docker exec blogger-approval-backend npm run migrate

# Verify
curl http://localhost:3000/api/health
open http://localhost:3001  # Frontend at 3001
```

---

## 🆘 Troubleshooting

### Issue: Database Connection Failed
```bash
# Check DATABASE_URL is set
vercel env list

# Check format:
# postgresql://user:password@host:5432/database_name
```

### Issue: Login Failed
```bash
# Check admin user exists
curl -X GET https://your-backend/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# If empty, run seed:
# In Vercel console, run src/database/seed.sql
```

### Issue: Frontend Can't Call API
```bash
# Check REACT_APP_API_URL in frontend env vars
# Should be: https://your-backend.vercel.app/api

# Check CORS is configured
# In src/app.js, update CORS origin to frontend URL
```

### Issue: Bookings Not Creating
```bash
# Check finances endpoint was called correctly
# It should return: {"success":true,"data":{"bookingId":"book-xxx"}}

# Verify booking exists:
curl -X GET https://your-backend/api/bookings \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## ✨ What You Now Have

✅ Production-ready API with 37 endpoints  
✅ React dashboard for 5 different roles  
✅ 7-day automatic booking system working  
✅ Google Sheets integration ready  
✅ Complete audit logging  
✅ Security best practices  
✅ Database with 10 optimized tables  
✅ Scheduled jobs for auto-expiry  

---

## 📚 Next Steps

1. **Verify everything works** (run test workflows above)
2. **Change demo passwords** (for security)
3. **Read API_DOCUMENTATION.md** (if you need to customize)
4. **Set up monitoring** (Vercel Analytics, error tracking)
5. **Create your users** (replace demo users with real ones)
6. **Start using!** (upload your bloggers and teams)

---

## 🎁 Bonus: Local Development

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Create .env.local
cat > .env.local << EOF
DATABASE_URL=postgresql://localhost:5432/blogger_approval
JWT_SECRET=dev-secret-min-32-chars
JWT_REFRESH_SECRET=dev-secret-min-32-chars
EOF

# Start backend
npm start

# Start frontend (in new terminal)
cd frontend
npm start

# Open http://localhost:3001
```

---

## 🎉 Congratulations!

You now have a **complete, production-ready blogger approval system** with:
- Full API
- React dashboard
- 7-day booking system
- Security & audit logging
- Deployed to Vercel

**Time to deploy: ~30 minutes**  
**Time to production: TODAY**

---

**Need help?** Read the full documentation:
- `DEPLOYMENT_GUIDE.md` - Detailed deployment
- `API_DOCUMENTATION.md` - API reference
- `README_COMPLETE.md` - Full overview

