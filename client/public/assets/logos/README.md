# Pluqla Feature Logos

This directory contains all mascotte-based logos used throughout the Pluqla app.

## 📁 Logo Files

| Filename | Feature | Description | Size |
|----------|---------|-------------|------|
| `logo_economies.png` | Finance/Économies | Red cat mascot with euro coin | 167KB |
| `logo_food.png` | Alimentation | Food mascot | 649KB |
| `logo_transport.png` | Transport | Transport mascot | 568KB |
| `logo_mode.png` | Habits | Fashion/lifestyle mascot | 687KB |
| `logo_lifestyle.png` | Activité | Activity mascot | 756KB |

## 🔗 Usage in Code

All logos are referenced in the HomeScreen CategoryGrid component:

**File:** [`client/src/components/home/CategoryGrid.jsx`](../../src/components/home/CategoryGrid.jsx)

```javascript
const categories = [
  {
    id: 'finance',
    title: 'Finance',
    icon: '/assets/logos/logo_economies.png',  // ← Red cat logo
    iconType: 'image',
    iconAlt: 'Mascotte Économies Pluqla',
    notifications: 0,
    isPremium: true
  },
  // ... other categories
];
```

## 🎨 Design Specifications

### Styling Properties
- **Container Size:** `w-16 h-16` (mobile) / `w-20 h-20` (desktop)
- **Padding:** `p-2` for breathing room
- **Object Fit:** `object-contain` to maintain aspect ratio
- **Image Rendering:** `-webkit-optimize-contrast` for crisp display
- **Max Dimensions:** `max-w-full max-h-full` to prevent overflow

### Visual Effects
- **Drop Shadow (Dark Mode):** `drop-shadow-lg` with red glow on hover
- **Drop Shadow (Light Mode):** `drop-shadow-md` with enhanced contrast on hover
- **Hover Scale:** `scale-110` on parent container
- **Transition:** Smooth 300ms animation

## 📝 How to Update Logos

### Replace the Finance Logo

1. **Prepare your new logo:**
   - Recommended format: PNG with transparent background
   - Optimal size: 512x512px or similar square ratio
   - Keep file size reasonable (< 500KB if possible)

2. **Replace the file:**
   ```bash
   # Option 1: Overwrite existing file
   cp your-new-logo.png client/public/assets/logos/logo_economies.png

   # Option 2: Use a different filename and update code
   cp your-new-logo.png client/public/assets/logos/logo_main.png
   ```

3. **Update the code (if using different filename):**
   Edit [`client/src/components/home/CategoryGrid.jsx`](../../src/components/home/CategoryGrid.jsx):
   ```javascript
   icon: '/assets/logos/logo_main.png',  // Update this line
   ```

4. **Test the changes:**
   ```bash
   cd client && npm start
   ```

### Replace Other Feature Logos

Follow the same process as above, but update the corresponding category entry:
- `logo_food.png` → Alimentation feature
- `logo_transport.png` → Transport feature
- `logo_mode.png` → Habits feature
- `logo_lifestyle.png` → Activité feature

## 🎯 Best Practices

### File Naming Convention
- Use lowercase with underscores: `logo_feature_name.png`
- Be descriptive: avoid generic names like `icon1.png`
- Keep consistent: all logos use `logo_` prefix

### Image Requirements
- ✅ **Format:** PNG (for transparency) or SVG (scalable)
- ✅ **Background:** Transparent (no white/gray squares)
- ✅ **Aspect Ratio:** Square or near-square (1:1 ratio)
- ✅ **Resolution:** High-res (at least 512x512px)
- ✅ **Colors:** Should work on both light and dark backgrounds

### Testing Checklist
- [ ] Logo displays centered in card
- [ ] No stretching or distortion
- [ ] Transparent background renders correctly
- [ ] Looks good on both light and dark themes
- [ ] Hover effects work smoothly
- [ ] Responsive on mobile and desktop
- [ ] File size is optimized

## 🔍 Troubleshooting

### Logo Not Appearing
- Check file path is correct: `/assets/logos/filename.png`
- Verify file exists in `client/public/assets/logos/`
- Check browser console for 404 errors
- Clear browser cache and refresh

### Logo Looks Blurry
- Ensure original image is high resolution
- Check `imageRendering` CSS property is set correctly
- Try using SVG format for vector graphics

### Logo Has White Background
- Original file doesn't have transparent background
- Re-export as PNG with transparency enabled
- Or use image editing tool to remove background

### Logo Size Issues
- Adjust container padding: change `p-2` to `p-1` or `p-3`
- Modify max dimensions in inline styles
- Update `w-16 h-16` classes for larger/smaller size

## 📚 Related Documentation

- [HomeScreen Component](../../src/components/home/HomeScreen.jsx)
- [CategoryGrid Component](../../src/components/home/CategoryGrid.jsx)
- [Pluqla Design System](../../../docs/DESIGN.md)

---

**Last Updated:** 2025-09-30
**Maintained by:** Pluqla Dev Team
