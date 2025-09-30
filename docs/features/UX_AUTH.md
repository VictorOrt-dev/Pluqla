# 🔒 Pluqla Authentication UX Documentation

**Version:** 2.0.0
**Last Updated:** December 2024
**Author:** Pluqla Dev Team

---

## 📋 Overview

This document describes the redesigned authentication experience for Pluqla. The new auth screens provide a premium, accessible, and mobile-first experience that reflects Pluqla's brand identity while maintaining fintech-grade security and trust.

### Design Goals

- **Premium but Warm**: Polished fintech aesthetic with friendly, encouraging tone
- **Accessibility First**: WCAG 2.1 AA compliant with comprehensive ARIA support
- **Mobile-First**: Optimized for 320px-1440px viewports with touch-friendly interactions
- **Performance**: 60fps GPU-optimized animations, no heavy assets
- **Security Trust**: Clear security indicators without feeling intimidating

---

## 🏗️ Architecture

### Component Structure

```
client/src/
├── components/
│   └── auth/
│       ├── AuthLayout.jsx         # Shared layout with security badges
│       ├── LoginForm.jsx          # Login form with validation
│       ├── SignupForm.jsx         # Signup form with validation
│       └── LoginScreen.jsx        # Main auth screen (updated)
├── styles/
│   └── auth.css                   # Auth-specific styles using unified-theme
└── tests/
    └── LoginForm.test.jsx         # Comprehensive unit tests
```

### Component Hierarchy

```
LoginScreen (Container)
└── AuthLayout (Shared Layout)
    ├── LanguageSelector (Top-right)
    ├── LoginForm | SignupForm (Conditional)
    │   ├── Logo + Header
    │   ├── Form Inputs (with validation)
    │   ├── Submit Button
    │   └── Mode Switch Link
    └── Security Badges (Footer)
```

---

## 🎨 Visual Design

### Color Palette (from unified-theme.css)

- **Primary**: `#F14545` (Pluqla signature red)
- **Primary Hover**: `#D73030`
- **Background**: Linear gradient from `#FAFAFA` to `#FFE5E5`
- **Card**: `#FFFFFF` with subtle red border
- **Text Primary**: `#1A202C` (gray-900)
- **Text Secondary**: `#718096` (gray-600)
- **Error**: `#F14545`

### Typography Scale

- **H1 (Title)**: 30px / 1.75rem (mobile), 36px / 2.25rem (desktop)
- **Subtitle**: 16px / 1rem
- **Body**: 16px / 1rem
- **Labels**: 14px / 0.875rem
- **Small Text**: 12px / 0.75rem

### Spacing

Uses 8px base unit from design system:
- Form gap: 24px (space-6)
- Card padding: 32px (space-8) desktop, 24px (space-6) mobile
- Input padding: 12px 16px (space-3 space-4)

### Shadows & Borders

- **Card Shadow**: `var(--pluqla-shadow-xl)` - 0 20px 25px rgba(0,0,0,0.1)
- **Button Shadow**: `var(--pluqla-shadow-premium)` - 0 8px 25px rgba(241,69,69,0.3)
- **Border Radius**: 16px (radius-lg) for inputs, 24px (radius-xl) for cards

---

## 🔐 Authentication Flows

### Login Flow

```
1. User navigates to /login (or app detects no auth)
2. LoginScreen renders with LoginForm (default mode)
3. User enters email + password
4. Client-side validation (inline + on blur)
5. On submit:
   - Disable form, show loading spinner
   - Call login API via AuthContext
   - On success: redirect to /home
   - On error: show server error banner (role="status")
6. User can switch to signup mode
```

### Signup Flow

```
1. User clicks "Pas encore de compte ? S'inscrire"
2. LoginScreen switches to SignupForm
3. User enters name, email, password, confirm password
4. Client-side validation (inline + on blur)
5. On submit:
   - Disable form, show loading spinner
   - Call register API via authService
   - On success: auto-login + redirect to /onboarding
   - On error: show server error banner
6. User can switch to login mode
```

---

## ♿ Accessibility Features

### ARIA Attributes

| Element | Attributes | Purpose |
|---------|-----------|---------|
| Email Input | `aria-label`, `aria-invalid`, `aria-describedby` | Screen reader support + error linking |
| Password Input | `aria-label`, `aria-invalid`, `aria-describedby` | Screen reader support + error linking |
| Password Toggle | `aria-label`, `aria-pressed` | Announces state change |
| Submit Button | `aria-busy` | Announces loading state |
| Error Banner | `role="status"`, `aria-live="polite"` | Announces server errors |
| Inline Errors | `role="alert"` | Announces validation errors |

### Keyboard Navigation

- **Auto-focus**: First input receives focus on mount
- **Tab Order**: Email → Password → Toggle → Submit → Switch Link
- **Enter Key**: Submits form from any input
- **Escape**: Can close modals (future enhancement)

### Focus States

All interactive elements have visible focus indicators:
- **Inputs**: 2px solid red outline + 3px rgba(241,69,69,0.1) ring
- **Buttons**: 3px rgba(241,69,69,0.2) ring
- **Links**: 2px rgba(241,69,69,0.2) ring

### Touch Targets

All interactive elements meet WCAG minimum 44x44px:
- Inputs: 48px min-height
- Buttons: 48px min-height
- Password toggle: 44x44px
- Links: 44px min-height (inline-flex)

### Reduced Motion

Respects `prefers-reduced-motion` media query:
- Disables all animations and transitions
- Maintains layout and functionality

### High Contrast Mode

Respects `prefers-contrast: high`:
- Increases border width to 3px
- Enhances focus ring to 4px
- Adds border to primary button

---

## ✅ Form Validation

### Client-Side Rules

#### Email
- **Required**: "L'email est requis"
- **Format**: Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` - "Format d'email invalide"

#### Password
- **Required**: "Le mot de passe est requis"
- **Min Length**: 6 characters - "Minimum 6 caractères"

#### Name (Signup only)
- **Required**: "Le nom est requis"

#### Confirm Password (Signup only)
- **Required**: "Le mot de passe est requis"
- **Match**: Must match password - "Les mots de passe ne correspondent pas"

### Validation Triggers

1. **On Blur**: First validation happens when user leaves field
2. **On Change**: Error clears as soon as user starts typing
3. **On Submit**: All fields validated before API call

### Error Display

- **Inline**: Red text below input with warning icon
- **Link**: Error message has `id`, input has `aria-describedby`
- **Server**: Banner at top of form with `role="status"`

---

## 🎯 User Experience Patterns

### Progressive Disclosure

- **Single Mode**: Only login OR signup form visible at once
- **Minimal Fields**: Only essential fields (no "remember me", "forgot password" in v1)
- **Clear Actions**: One primary CTA, one secondary link

### Feedback States

| State | Visual | Behavior |
|-------|--------|----------|
| Idle | Normal inputs, enabled button | Ready for input |
| Typing | Focus ring, clear errors on change | Immediate feedback |
| Validating | Inline errors on blur | Non-blocking validation |
| Submitting | Disabled inputs, spinner in button | Prevent double-submit |
| Success | Redirect (no intermediate state) | Fast transition |
| Error | Red banner at top with icon | Persistent until resolved |

### Micro-Interactions

- **Button Hover**: Lift -1px + enhanced shadow (60fps transform)
- **Input Focus**: Border color transition + ring fade-in
- **Password Toggle**: Icon change + subtle scale
- **Card Entry**: Scale + fade animation (respects reduced-motion)

### Copy Tone

| Context | Example | Tone |
|---------|---------|------|
| Title | "Bienvenue chez Pluqla" | Warm, welcoming |
| Subtitle | "Ton espace pour économiser intelligemment" | Friendly, personal (tu/toi) |
| CTA | "Se connecter", "Créer mon compte" | Direct, action-oriented |
| Error | "L'email est requis" | Clear, helpful (not technical) |
| Security | "Tes données personnelles sont protégées" | Reassuring, trustworthy |

---

## 📱 Responsive Behavior

### Breakpoints

- **Mobile**: 320px - 640px
- **Tablet**: 641px - 1024px
- **Desktop**: 1025px+

### Layout Adaptations

#### Mobile (≤640px)
- Card padding: 24px (from 32px)
- Logo size: 56px (from 64px)
- Title: 24px (from 30px)
- Security badges: Stack if needed
- Language selector: Top-right, smaller

#### Desktop (≥1025px)
- Max card width: 448px
- Centered on screen
- Generous whitespace
- Full-size elements

### Touch Optimizations

- **Input Height**: 48px (comfortable thumb reach)
- **Button Height**: 48px
- **Spacing**: Minimum 8px between interactive elements
- **Icons**: 20x20px (easy to see, not too large)

---

## 🧪 Testing

### Unit Tests (LoginForm.test.jsx)

Comprehensive test coverage for:
- ✅ Rendering all required elements
- ✅ ARIA attributes presence and correctness
- ✅ Validation logic (email, password, required)
- ✅ Error display and aria-describedby linking
- ✅ Form submission with valid data
- ✅ Password visibility toggle
- ✅ Loading and disabled states
- ✅ Keyboard navigation and focus management
- ✅ Mode switching (login ↔ signup)

Run tests:
```bash
cd client
npm test -- tests/LoginForm.test.jsx
```

### Accessibility Checks

#### Automated (axe-core)
```bash
cd client
npm start
# In another terminal:
npx @axe-core/cli http://localhost:3000/login
```

**Expected Result**: 0 critical issues, 0 WCAG AA violations

#### Manual Checks
- [ ] Tab through all elements (correct order)
- [ ] Screen reader announces form errors
- [ ] Focus visible on all interactive elements
- [ ] High contrast mode renders correctly
- [ ] Reduced motion disables animations

### Cross-Browser Testing

Tested on:
- ✅ Chrome 120+ (Desktop + Mobile)
- ✅ Firefox 121+
- ✅ Safari 17+ (macOS + iOS)
- ✅ Edge 120+

### Device Testing

- ✅ iPhone SE (320px width)
- ✅ iPhone 12/13/14 (390px)
- ✅ iPad (768px)
- ✅ Desktop 1366px, 1920px

---

## 🚀 Performance

### Metrics

- **First Paint**: < 1s
- **Time to Interactive**: < 1.5s
- **Animation Frame Rate**: 60fps (GPU-accelerated)
- **CSS Size**: ~8KB (auth.css)
- **JS Bundle**: Lazy-loaded components

### Optimizations

- **GPU Acceleration**: `transform` and `opacity` for animations
- **No Heavy Images**: Logo only (small SVG/PNG)
- **CSS Variables**: Reuse from unified-theme.css
- **No External Fonts**: System font stack
- **Lazy Loading**: Auth components only loaded when needed

---

## 🔗 Integration Points

### API Endpoints (Unchanged)

- **POST** `/api/auth/login` - Login with email + password
- **POST** `/api/auth/register` - Register new user
- Returns: `{ success: boolean, message?: string, data?: {...} }`

### Context Integration

```javascript
// AuthContext
const { login, error, clearError } = useAuth();

// NavigationContext
const { setCurrentScreen } = useNavigation();

// i18n
const { t } = useTranslation();
```

### LocalStorage

- `authMode`: 'register' | null (persists user intent)
- `isNewUser`: 'true' (triggers onboarding after signup)
- `accessToken`: JWT token (managed by AuthContext)

---

## 📝 Future Enhancements

### Phase 2
- [ ] "Forgot Password" flow
- [ ] Email verification required
- [ ] Social login (Google, Apple)
- [ ] Password strength indicator (visual)
- [ ] "Remember Me" checkbox

### Phase 3
- [ ] Two-factor authentication (2FA)
- [ ] Biometric login (Touch ID, Face ID)
- [ ] Magic link login (passwordless)
- [ ] Session management UI

---

## 🐛 Known Issues & Limitations

1. **Logo Fallback**: If `/pluqla-logo.png` doesn't load, shows "P" letter
2. **Server Error Persistence**: Error banner stays until mode switch or new submit
3. **No Password Recovery**: Users must contact support if forgotten
4. **Email Verification**: Not enforced yet (Phase 2)

---

## 📚 Assets

### Images

- **Logo**: `client/public/pluqla-logo.png` (64x64px recommended)
- **Fallback**: CSS-rendered "P" in gradient container

### Stylesheets

- **Main**: `client/src/styles/auth.css` (imports unified-theme.css)
- **Variables**: Defined in `client/src/styles/unified-theme.css`

### Icons

All icons are inline SVG (no external dependencies):
- Email icon (envelope)
- Password icon (lock)
- User icon (person)
- Eye icon (password toggle)
- Warning icon (errors)
- Shield/checkmark icons (security badges)

---

## 👥 Stakeholders & Contact

- **Product Designer**: Responsible for visual design and UX flows
- **Frontend Engineer**: Implementation and accessibility
- **QA Engineer**: Cross-browser and device testing
- **Backend Engineer**: API integration and error messages

For questions or feedback: #pluqla-dev on Slack

---

**Version History**

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Dec 2024 | Complete redesign with accessibility focus |
| 1.0.0 | Oct 2024 | Initial auth screens (legacy) |

---

**License**: Internal Pluqla documentation - Not for public distribution
