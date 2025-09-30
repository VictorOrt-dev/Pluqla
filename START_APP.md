# 🚀 Start PLUQLA Application - Complete Guide

## Quick Start (Both Frontend & Backend)

### Option 1: Start Everything (Recommended)

**Terminal 1 - Backend:**
```bash
cd server
npm start
```
Wait for: `✅ Database connected successfully`

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```
Wait for: `webpack compiled successfully`

**Access Application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3004

---

## Detailed Setup Instructions

### 1️⃣ First Time Setup

**Backend Setup:**
```bash
cd server

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Setup database
npx prisma db push

# Start server
npm start
```

**Frontend Setup:**
```bash
cd client

# Install dependencies
npm install

# Start development server
npm start
```

### 2️⃣ Daily Development

Just run in two separate terminals:

```bash
# Terminal 1
cd server && npm start

# Terminal 2
cd client && npm start
```

---

## 🔍 Verification

### Backend Health Check

```bash
curl http://localhost:3004/api/health
```

**Expected Response:**
```json
{"status":"API OK","timestamp":"2025-09-30T...","version":"1.0.0"}
```

### Frontend Verification

Open browser: http://localhost:3000

**You should see:**
- ✅ HomeScreen with Pluqla branding
- ✅ 4 mascotte logos (Activité, Mode, Transport, Alimentation)
- ✅ Finance card with 💰 emoji
- ✅ Smooth animations on hover

---

## 🎨 Testing Logo Integration

Once both servers are running:

1. **Navigate to HomeScreen** (default landing page)

2. **Verify Logos Display:**
   - Activité → Lifestyle mascotte
   - Mode → Fashion mascotte
   - Transport → Vehicle mascotte
   - Alimentation → Food mascotte

3. **Test Interactions:**
   - Hover over each card
   - Icon should scale to 110%
   - Drop shadow should intensify
   - Card should lift slightly

4. **Test Responsiveness:**
   - Resize browser window
   - Open DevTools (F12) → Toggle device toolbar
   - Test on mobile/tablet viewports

5. **Test Dark Mode:**
   - Toggle dark mode in app settings
   - Verify logos remain visible
   - Check glow effects work properly

---

## 🐛 Troubleshooting

### Backend Won't Start

**Issue:** Port 3004 already in use

**Solution:**
```powershell
# Find process on port 3004
netstat -ano | findstr :3004

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### Frontend Won't Start

**Issue:** Port 3000 already in use

**Solution:**
```bash
# Start on different port
PORT=3001 npm start
```

### Logos Don't Appear

**Issue:** 404 errors for logo files

**Solution:**
```bash
# Verify logos exist
ls client/public/assets/logos/

# Should show 4 PNG files
# If missing, copy from root:
cp logo_*.png client/public/assets/logos/
```

### Database Connection Failed

**Issue:** Cannot connect to SQLite database

**Solution:**
```bash
cd server

# Regenerate Prisma client
npx prisma generate

# Recreate database
npx prisma db push

# Restart server
npm start
```

---

## 📊 What's Running?

After successful startup:

```
┌─────────────────────────────────────────┐
│  BACKEND SERVER                         │
│  Port: 3004                             │
│  URL: http://localhost:3004             │
│  Status: ✅ Running                     │
│  Database: SQLite (dev.db)              │
│  Auth: JWT (legacy mode)                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  FRONTEND SERVER                        │
│  Port: 3000                             │
│  URL: http://localhost:3000             │
│  Status: ✅ Running                     │
│  Framework: React 18                    │
│  Build: Development (HMR enabled)       │
└─────────────────────────────────────────┘
```

---

## 🎯 Testing Checklist

Once both servers are running:

### Visual Verification
- [ ] HomeScreen loads without errors
- [ ] 4 mascotte logos visible and crisp
- [ ] Finance shows 💰 emoji
- [ ] No broken images or 404s
- [ ] Transparent backgrounds (no white squares)

### Functionality
- [ ] Click each category card (should navigate)
- [ ] Hover effects work smoothly
- [ ] Notification badges display
- [ ] Premium badge on Finance card

### Responsiveness
- [ ] Desktop view (1920×1080)
- [ ] Tablet view (768×1024)
- [ ] Mobile view (375×667)
- [ ] No horizontal scrolling

### Performance
- [ ] Initial load < 3 seconds
- [ ] Smooth scrolling
- [ ] No layout shifts
- [ ] Animations at 60fps

### Authentication
- [ ] Can register new user
- [ ] Can login existing user
- [ ] Token received and stored
- [ ] Protected routes work

---

## 📝 Quick Commands Reference

### Development
```bash
# Start backend
cd server && npm start

# Start frontend
cd client && npm start

# Run tests
npm test

# Build production
npm run build
```

### Database
```bash
cd server

# Regenerate client
npx prisma generate

# Apply schema changes
npx prisma db push

# View database
npx prisma studio
```

### Debugging
```bash
# Backend logs
cd server && npm start

# Clear caches
rm -rf node_modules package-lock.json
npm install

# Reset database
rm server/dev.db
npx prisma db push
```

---

## 🎉 Success Indicators

Everything is working correctly when you see:

**Backend Terminal:**
```
✅ All environment variables are secure
🚀 Server running on port 3004 in development mode
✅ Database connected successfully (4ms)
✅ Session cleanup service initialized
```

**Frontend Terminal:**
```
webpack compiled successfully
Compiled successfully!

You can now view plus-clair-app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.1.x:3000
```

**Browser:**
- HomeScreen displays
- Logos render clearly
- No console errors
- Smooth interactions

---

## 🚀 Ready for Development!

Both servers are now running and the logo integration is complete.

**Next Steps:**
1. Explore the HomeScreen
2. Test all category navigation
3. Verify authentication flows
4. Check responsive design
5. Test dark mode

**Documentation:**
- Technical Report: `LOGO_INTEGRATION_REPORT.md`
- Testing Guide: `TESTING_LOGO_INTEGRATION.md`
- Summary: `LOGO_INTEGRATION_SUMMARY.txt`
- Backend Fixes: `BACKEND_AUTHENTICATION_FIX.md`

---

**Happy Coding! 🎨✨**
