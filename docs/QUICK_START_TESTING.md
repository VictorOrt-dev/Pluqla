# Quick Start Testing Guide

## 🚀 Immediate Deployment & Testing

### Step 1: Run Database Migration

```bash
cd server
npx prisma migrate dev --name add_transport_trips
npx prisma generate
```

**Expected**: Migration files created in `server/prisma/migrations/`, Prisma Client updated.

---

### Step 2: Start Backend

```bash
cd server
npm run dev
```

**Expected**: Server starts on `http://localhost:3004`

**Verify**:
```bash
curl http://localhost:3004/api/health
```

Expected response:
```json
{
  "status": "API OK",
  "timestamp": "2024-12-XX...",
  "version": "1.0.0"
}
```

---

### Step 3: Start Frontend

```bash
cd client
npm start
```

**Expected**: App opens at `http://localhost:3000`

---

## ✅ Feature Testing Checklist

### 1. Free/Premium Badge (Header)

**Test Steps**:
1. Open app in browser
2. Log in with any user account
3. Look at top header between streak and dark mode toggle

**Expected**:
- Badge visible showing "FREE" (gray) or "⭐ PREMIUM" (red gradient)
- Badge adapts to dark/light mode
- Badge reflects `user.subscriptionTier` or `user.isPremium`

**Screenshot Location**: Top-right header area

---

### 2. Transport Trip CRUD (Backend)

**Test with cURL**:

#### Create Trip
```bash
curl -X POST http://localhost:3004/api/trips \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Trip",
    "origin": "Home",
    "destination": "Work",
    "distanceKm": 10.5,
    "recurring": true
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "userId": "...",
    "name": "Test Trip",
    "origin": "Home",
    "destination": "Work",
    "distanceKm": 10.5,
    "recurring": true,
    "createdAt": "...",
    "updatedAt": "..."
  },
  "message": "Trip created successfully"
}
```

#### List Trips
```bash
curl -X GET http://localhost:3004/api/trips \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "trips": [...],
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Update Trip
```bash
curl -X PUT http://localhost:3004/api/trips/TRIP_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Trip Name",
    "distanceKm": 12.0
  }'
```

**Expected**: Trip updated with new values

#### Delete Trip
```bash
curl -X DELETE http://localhost:3004/api/trips/TRIP_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected**:
```json
{
  "success": true,
  "message": "Trip deleted successfully"
}
```

---

### 3. Meal Suggestions Refresh

**Test Steps**:
1. Log in to frontend
2. Navigate to **Alimentation** screen
3. Scroll to **Nutrition IA** section
4. Fill form with preferences:
   - Type de repas: Dîner
   - Nombre de personnes: 2
   - Budget: 15€
5. Click **🍽️ Générer des suggestions**
6. Wait for results to load
7. Once results appear, look for **🔄 Rafraîchir** button in top-right of results
8. Click **🔄 Rafraîchir** button

**Expected**:
- Loading indicator appears
- New suggestions generated
- Different meals than previous request (may use cache if parameters identical)
- Button disabled during loading

---

### 4. Mode Photo Match Integration

**Test Steps**:
1. Log in to frontend
2. Navigate to **Habits** screen
3. Select **Analyse Mode** tab
4. Upload clothing image (JPG/PNG/WEBP)
   - Either drag-drop or click to select
5. Observe during upload

**Expected During Upload**:
- Loading spinner appears
- Progress bar shows 0-100%
- Text shows "Analyse IA en cours... X%"
- Progress bar fills smoothly

**Expected After Analysis**:
- Success message: "✅ Analyse terminée avec succès"
- Match type and score displayed (if available)
- Quota badge appears at bottom:
  - **Green**: >50% quota remaining
  - **Yellow**: <50% but >0%
  - **Red**: 0% remaining
  - Text: "Quota IA: X/Y analyses restantes"

**Expected in Network Tab**:
- POST request to `/api/photo-match` with base64 image
- Polling requests to `/api/photo-match/{jobId}`
- Status progression: `pending` → `processing` → `completed`

**Expected in Database**:
- New `PhotoMatchJob` record created
- New `PhotoMatchResult` record created
- New `AiUsage` record created with `feature: 'photo_match'`
- User's quota decremented

---

## 🔍 Verification Commands

### Check Database Tables

```bash
cd server
npx prisma studio
```

Then verify:
- `transport_trips` table exists
- Sample trip records visible
- `photo_match_jobs` and `photo_match_results` tables have new records
- `ai_usage` table shows quota consumption

---

### Check Backend Logs

```bash
# Look for trip creation logs
grep "Transport trip created" server/logs/*.log

# Look for Photo Match logs
grep "Photo match job created" server/logs/*.log

# Look for quota checks
grep "AI quota" server/logs/*.log
```

---

## ⚠️ Troubleshooting

### Issue: "Prisma Client not generated"

**Solution**:
```bash
cd server
rm -rf node_modules/.prisma
npx prisma generate
npm run dev
```

---

### Issue: "Trip API returns 404"

**Checks**:
1. Verify backend started successfully
2. Check `server/src/routes/index.js` has `router.use('/trips', transportTripRoutes)`
3. Restart backend server
4. Check logs for route registration

---

### Issue: "Photo Match returns 401 Unauthorized"

**Checks**:
1. Ensure user is logged in
2. Check localStorage for JWT token: `localStorage.getItem('token')`
3. Verify token is included in request headers
4. Check token expiration

---

### Issue: "Quota not showing in Mode"

**Checks**:
1. Verify `aiQuotaMiddleware` applied to `/api/photo-match` route
2. Check Photo Match response includes `quota` field
3. Verify `addQuotaToResponse` middleware is active
4. Check browser console for errors

---

### Issue: "Free/Premium badge not showing"

**Checks**:
1. Verify `userData` prop passed to Header component
2. Check `userData.subscriptionTier` or `userData.isPremium` value
3. Inspect header DOM for badge element
4. Check browser console for React errors

---

## 🎯 Quick Manual Test Flow (5 minutes)

1. ✅ **Login** → Badge visible in header
2. ✅ **Navigate to Alimentation** → Generate meal suggestions
3. ✅ **Click Refresh** → New suggestions load
4. ✅ **Navigate to Habits** → Upload clothing image
5. ✅ **Observe progress** → Progress bar and quota display
6. ✅ **Open DevTools** → Check network requests to `/api/trips` (none yet, need UI)
7. ✅ **Test API with cURL** → Create/list/update/delete trips

**Total Time**: ~5 minutes
**Coverage**: 80% of new features (UI integration pending)

---

## 📊 Success Criteria

| Feature | Test | Status |
|---------|------|--------|
| Database migration | Prisma migrate runs | ⏳ Pending |
| Backend starts | Server up without errors | ⏳ Pending |
| Frontend starts | App loads without errors | ⏳ Pending |
| Header badge | Visible and correct tier | ⏳ Pending |
| Trip API (Create) | POST returns 201 + data | ⏳ Pending |
| Trip API (List) | GET returns trips array | ⏳ Pending |
| Trip API (Update) | PUT updates trip | ⏳ Pending |
| Trip API (Delete) | DELETE removes trip | ⏳ Pending |
| Meal Refresh | Button works, new data | ⏳ Pending |
| Mode Photo Match | Upload triggers backend | ⏳ Pending |
| Photo Match Progress | Progress bar animates | ⏳ Pending |
| Photo Match Quota | Quota badge displays | ⏳ Pending |
| No console errors | Clean browser console | ⏳ Pending |
| No backend errors | Clean server logs | ⏳ Pending |

---

## 🎉 Next Steps After Testing

1. ✅ If all tests pass → **Ready for staging deployment**
2. ⚠️ If issues found → **Debug and fix**
3. 📝 Update `IMPLEMENTATION_COMPLETE.md` with test results
4. 🔄 Create PR for code review
5. 🚀 Deploy to staging environment
6. 🧪 Run full QA test suite
7. ✅ Merge to master after approval

---

**Test Execution Date**: ___________
**Tester**: ___________
**Result**: ___________
**Notes**: ___________
