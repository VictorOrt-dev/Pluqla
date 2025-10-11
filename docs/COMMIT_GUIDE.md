# Git Commit Guide - Feature Implementation

## 📦 Commit Strategy

This implementation includes multiple features that should be committed together as they're interdependent.

---

## 🎯 Recommended Commit Approach

### Option 1: Single Feature Commit (Recommended)

**Single comprehensive commit with all changes:**

```bash
git add .
git commit -m "$(cat <<'EOF'
feat: add transport trip CRUD, premium badge, meal refresh, and mode integration

Major Features:
- Add Free/Premium badge to header showing user subscription tier
- Implement full CRUD for user transport trips (backend + frontend hook)
- Add refresh button to meal suggestions for forcing new generation
- Fix Mode feature to use Photo Match backend with quota enforcement

Backend Changes:
- Add TransportTrip Prisma model with userId relation
- Create transportTripService with full CRUD operations
- Add /api/trips routes with validation and rate limiting
- Integrate Photo Match quota enforcement in Mode feature

Frontend Changes:
- Add useTrips hook with optimistic UI updates
- Update Header with Free/Premium badge (adaptive to dark/light mode)
- Add refresh button to MealSuggestions component
- Update ClothingAnalyzer to use usePhotoMatch instead of local analysis
- Add progress bar and quota display to photo upload

Security:
- User ownership verification on all trip operations
- Input validation via Joi on all endpoints
- Rate limiting applied to prevent abuse
- Sanitized error messages (no stack traces)
- Quota enforcement on AI-powered features

Testing:
- Manual testing guide provided in QUICK_START_TESTING.md
- Unit/integration tests pending (marked as TODO)

Documentation:
- IMPLEMENTATION_COMPLETE.md - Full technical documentation
- QUICK_START_TESTING.md - Testing guide
- COMMIT_GUIDE.md - This file

Breaking Changes: None
Migration Required: Yes - run `npx prisma migrate dev`

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Option 2: Separate Commits by Feature

**If you prefer smaller, focused commits:**

#### Commit 1: Database Schema
```bash
git add server/prisma/schema.prisma
git commit -m "feat(db): add TransportTrip model for user trip persistence

- Add TransportTrip model with userId, origin, destination, distanceKm
- Add indexes for performance (userId, userId+createdAt)
- Add relation to User model

Migration required: npx prisma migrate dev

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Commit 2: Backend Services & Routes
```bash
git add server/src/services/transportTripService.js
git add server/src/controllers/transportTripController.js
git add server/src/middleware/validation/transportTripValidation.js
git add server/src/routes/transportTrips.js
git add server/src/routes/index.js

git commit -m "feat(backend): implement transport trip CRUD API

- Add transportTripService with create/read/update/delete operations
- Add transportTripController with HTTP handlers
- Add Joi validation schemas for all endpoints
- Register /api/trips routes with auth and rate limiting
- User ownership verification on all operations

Endpoints:
- POST /api/trips - Create trip
- GET /api/trips - List trips (paginated)
- GET /api/trips/:id - Get trip by ID
- PUT /api/trips/:id - Update trip
- DELETE /api/trips/:id - Delete trip

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Commit 3: Frontend Hook
```bash
git add client/src/hooks/useTrips.js

git commit -m "feat(frontend): add useTrips hook for trip CRUD with optimistic UI

- Fetch trips on mount with pagination support
- Create/update/delete with optimistic UI updates
- Automatic rollback on errors
- Loading and error state management

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Commit 4: Header Badge
```bash
git add client/src/components/common/Header.jsx

git commit -m "feat(ui): add Free/Premium subscription badge to header

- Display user subscription tier between streak and dark mode toggle
- FREE: Muted gray badge
- PREMIUM: Pluqla cherry gradient with glow effect
- Adapts to dark/light mode
- Source: userData.subscriptionTier or userData.isPremium

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Commit 5: Meal Refresh
```bash
git add client/src/components/features/food/MealSuggestions.jsx

git commit -m "feat(meals): add refresh button to regenerate meal suggestions

- Add refresh button in results header
- Triggers new generation with same parameters
- Disabled during loading state
- Improves UX by allowing fresh suggestions on demand

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Commit 6: Mode/Photo Match Integration
```bash
git add client/src/components/features/habits/ClothingAnalyzer.jsx
git add client/src/screens/HabitsScreen.jsx

git commit -m "fix(mode): integrate Photo Match backend with quota enforcement

BREAKING CHANGE: Mode feature now uses backend Photo Match API

- Replace useImageAnalysis with usePhotoMatch hook
- Enforce AI quotas via backend middleware
- Add progress bar during analysis (0-100%)
- Display quota info (remaining/total)
- Enhanced result display with match type and score
- Metadata sent: category='clothing', source='habits_screen'

Benefits:
- Proper quota tracking and enforcement
- Centralized AI usage monitoring
- Job-based async processing
- Cache support for duplicate requests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Commit 7: Documentation
```bash
git add IMPLEMENTATION_COMPLETE.md
git add QUICK_START_TESTING.md
git add COMMIT_GUIDE.md

git commit -m "docs: add comprehensive implementation documentation

- IMPLEMENTATION_COMPLETE.md: Full technical documentation
  - Detailed changes summary
  - API endpoints documentation
  - Security features
  - Known limitations
  - Testing requirements
  - Deployment instructions

- QUICK_START_TESTING.md: Quick testing guide
  - Step-by-step verification
  - Manual test checklist
  - Troubleshooting guide
  - Success criteria

- COMMIT_GUIDE.md: Git commit guide
  - Recommended commit strategies
  - Pre-commit checklist

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## ✅ Pre-Commit Checklist

Before committing, verify:

- [ ] All modified files are staged
- [ ] No sensitive data (API keys, tokens, passwords) in code
- [ ] No console.log statements left in production code
- [ ] No commented-out code blocks (clean it up)
- [ ] Prisma schema is valid (`npx prisma validate`)
- [ ] No TypeScript/ESLint errors (`npm run lint`)
- [ ] Git status is clean (no unexpected files)

**Verify with**:
```bash
git status
git diff --cached
```

---

## 🚀 After Committing

### Create a Pull Request

```bash
# Push to remote
git push origin hardening/phase2-security-monitoring

# Create PR via GitHub CLI
gh pr create --title "feat: transport trips, premium badge, meal refresh, mode integration" --body "$(cat <<'EOF'
## Summary
Major feature update adding transport trip CRUD, subscription badge, meal refresh, and Mode/Photo Match integration.

## Changes
- ✅ Added Free/Premium badge to header
- ✅ Implemented transport trip CRUD (backend + frontend hook)
- ✅ Added meal suggestions refresh button
- ✅ Fixed Mode feature to use Photo Match backend with quotas

## Testing
- [x] Backend starts without errors
- [x] Frontend starts without errors
- [x] Manual testing of all features (see QUICK_START_TESTING.md)
- [ ] Unit tests (pending)
- [ ] Integration tests (pending)
- [ ] E2E tests (pending)

## Migration Required
```bash
cd server
npx prisma migrate dev --name add_transport_trips
npx prisma generate
```

## Documentation
- 📄 [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - Full technical doc
- 📄 [QUICK_START_TESTING.md](./QUICK_START_TESTING.md) - Testing guide

## Checklist
- [x] Code follows project conventions
- [x] Security best practices applied
- [x] Input validation on all endpoints
- [x] Rate limiting applied
- [x] Error handling implemented
- [x] Optimistic UI updates
- [ ] Tests added (marked as TODO)
- [x] Documentation complete

## Screenshots
_Add screenshots of:_
- Header with Free/Premium badge
- Meal refresh button
- Mode progress bar and quota display
- Trip API responses (cURL)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 🔍 Review Checklist for Reviewer

When reviewing this PR, check:

### Code Quality
- [ ] No hardcoded values (config in .env)
- [ ] Proper error handling on all operations
- [ ] No memory leaks (cleanup in useEffect)
- [ ] Consistent naming conventions
- [ ] No dead code or unused imports

### Security
- [ ] Auth middleware on all protected routes
- [ ] User ownership verification
- [ ] Input validation on all endpoints
- [ ] Rate limiting applied
- [ ] No PII in logs

### Performance
- [ ] Optimistic UI updates reduce perceived latency
- [ ] Database queries indexed
- [ ] Pagination on list endpoints
- [ ] No N+1 queries

### Testing
- [ ] Manual testing completed
- [ ] Unit tests needed (marked as TODO)
- [ ] Integration tests needed (marked as TODO)

---

## 📊 Git Statistics

**Expected changes:**
```
11 files changed
~1052 insertions(+)
~50 deletions(-)

New files (5):
- server/src/services/transportTripService.js
- server/src/controllers/transportTripController.js
- server/src/middleware/validation/transportTripValidation.js
- server/src/routes/transportTrips.js
- client/src/hooks/useTrips.js

Modified files (6):
- server/prisma/schema.prisma
- server/src/routes/index.js
- client/src/components/common/Header.jsx
- client/src/components/features/food/MealSuggestions.jsx
- client/src/components/features/habits/ClothingAnalyzer.jsx
- client/src/screens/HabitsScreen.jsx

Documentation (3):
- IMPLEMENTATION_COMPLETE.md
- QUICK_START_TESTING.md
- COMMIT_GUIDE.md
```

---

## 🎉 Final Steps

1. **Commit** using one of the strategies above
2. **Push** to remote branch
3. **Create PR** via GitHub or `gh pr create`
4. **Add screenshots** to PR description
5. **Request review** from team lead
6. **Run tests** on CI/CD pipeline
7. **Merge** after approval
8. **Deploy** to staging
9. **QA testing** on staging
10. **Deploy** to production

---

**Commit Strategy Used**: ___________
**PR Number**: ___________
**Review Status**: ___________
**Deployment Date**: ___________
