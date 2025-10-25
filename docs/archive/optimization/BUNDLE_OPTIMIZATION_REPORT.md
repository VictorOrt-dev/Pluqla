# Bundle Optimization Report

**Generated**: 2025-10-16T17:02:56.285Z

---

## 📊 Bundle Overview

### Main Bundle

- **File**: main.a62fb144.js
- **Size**: 417.02 KB
- **Status**: ❌ TOO LARGE

### Chunks

| Chunk | Size | Status |
|-------|------|--------|
| 484.be78dbe7.chunk.js | 202.42 KB | ⚠️ |
| 180.9242b85b.chunk.js | 135.73 KB | ✅ |
| 779.8905f1af.chunk.js | 93.56 KB | ✅ |
| 816.da0bda70.chunk.js | 66.82 KB | ✅ |
| 708.119347fa.chunk.js | 54.05 KB | ✅ |
| 289.1a236c53.chunk.js | 37.07 KB | ✅ |
| 917.df60547d.chunk.js | 31.95 KB | ✅ |
| 117.c7a6605b.chunk.js | 30.68 KB | ✅ |
| 282.471f7598.chunk.js | 29.40 KB | ✅ |
| 825.bc768b7c.chunk.js | 28.51 KB | ✅ |

## 📚 Detected Libraries

| Library | Occurrences | Est. Size | Optimization |
|---------|-------------|-----------|-------------|
| react-dom | 4 | 120-130 KB | Already optimized (core dependency) |
| i18next | 3 | 20-30 KB | ✅ Already optimized (lazy loading implemented) |
| react-i18next | 2 | 10-15 KB | ✅ Already optimized |
| date-fns | 1 | 10-70 KB (varies by imports) | 🟡 Import only needed functions |
| lodash | 8 | 20-70 KB | 🔴 HIGH: Replace with lodash-es and specific imports |

## 🧩 Component Analysis

| Metric | Count |
|--------|-------|
| Lazy Components | 0 |
| Suspense Boundaries | 0 |
| Error Boundaries | 0 |
| Memo Components | 0 |
| useCallback | 1 |
| useMemo | 1 |
| useEffect | 1 |
| useState | 1 |

## 💡 Optimization Recommendations

### 🔴 1. lodash (HIGH)

- **Impact**: 20-50 KB savings
- **Action**: Use lodash-es with specific imports
- **Effort**: Low

### 🟡 2. Component Optimization (MEDIUM)

- **Impact**: 10-20% faster re-renders
- **Action**: Add React.memo to large components
- **Effort**: Low

### 🟡 3. Code Splitting (MEDIUM)

- **Impact**: 100% of components not lazy
- **Action**: Lazy load more screen components
- **Effort**: Medium

## 🎯 Action Plan

1. Address HIGH priority optimizations first
2. Measure impact after each change
3. Re-run analysis to verify improvements
4. Target: Reduce main bundle to < 300 KB

