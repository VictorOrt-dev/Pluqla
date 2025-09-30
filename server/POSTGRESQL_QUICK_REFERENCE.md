# 🐘 PostgreSQL Quick Reference for Pluqla Developers

**Quick lookup for writing PostgreSQL-compatible raw SQL queries**

---

## 🔄 SQLite → PostgreSQL Cheat Sheet

### Date Formatting

| SQLite | PostgreSQL | Example |
|--------|------------|---------|
| `strftime('%Y-%m', date)` | `TO_CHAR(date, 'YYYY-MM')` | `'2024-09'` |
| `strftime('%Y-%m-%d', date)` | `TO_CHAR(date, 'YYYY-MM-DD')` | `'2024-09-30'` |
| `strftime('%Y', date)` | `TO_CHAR(date, 'YYYY')` | `'2024'` |
| `strftime('%m', date)` | `TO_CHAR(date, 'MM')` | `'09'` |
| `strftime('%d', date)` | `TO_CHAR(date, 'DD')` | `'30'` |
| `strftime('%H:%M:%S', time)` | `TO_CHAR(time, 'HH24:MI:SS')` | `'14:30:00'` |

### Date Arithmetic

| SQLite | PostgreSQL |
|--------|------------|
| `date('now')` | `NOW()` or `CURRENT_TIMESTAMP` |
| `date('now', '-1 day')` | `NOW() - INTERVAL '1 day'` |
| `date('now', '-7 days')` | `NOW() - INTERVAL '7 days'` |
| `date('now', '-1 month')` | `NOW() - INTERVAL '1 month'` |
| `date('now', '-6 months')` | `NOW() - INTERVAL '6 months'` |
| `date('now', '-1 year')` | `NOW() - INTERVAL '1 year'` |
| `date('now', '+1 day')` | `NOW() + INTERVAL '1 day'` |

### Date Functions

| Function | SQLite | PostgreSQL |
|----------|--------|------------|
| **Extract date** | `DATE(timestamp)` | `DATE(timestamp)` ✅ Same |
| **Extract year** | `strftime('%Y', date)` | `EXTRACT(YEAR FROM date)` |
| **Extract month** | `strftime('%m', date)` | `EXTRACT(MONTH FROM date)` |
| **Extract day** | `strftime('%d', date)` | `EXTRACT(DAY FROM date)` |
| **Day of week** | `strftime('%w', date)` | `EXTRACT(DOW FROM date)` |

### Column Names

| Column Type | SQLite | PostgreSQL |
|-------------|--------|------------|
| **camelCase** | `userId` | `"userId"` ⚠️ Requires quotes |
| **snake_case** | `user_id` | `user_id` ✅ No quotes needed |
| **Reserved word** | `user` | `"user"` ⚠️ Must quote |
| **Lowercase** | `amount` | `amount` ✅ No quotes needed |

### Type Casting

| Cast | SQLite | PostgreSQL |
|------|--------|------------|
| **String to timestamp** | Automatic | `'2024-01-01'::timestamp` |
| **ISO string to timestamp** | `${date.toISOString()}` | `${date.toISOString()}::timestamp` |
| **To text** | `CAST(value AS TEXT)` | `value::text` |
| **To integer** | `CAST(value AS INTEGER)` | `value::integer` |
| **To decimal** | `CAST(value AS REAL)` | `value::decimal` |

---

## ✅ Correct PostgreSQL Patterns

### Pattern 1: Monthly Aggregation

```sql
-- ✅ CORRECT
SELECT
  TO_CHAR("createdAt", 'YYYY-MM') as month,
  SUM(amount) as total_amount,
  COUNT(*) as count
FROM transactions
WHERE "userId" = ${userId}
  AND "createdAt" >= NOW() - INTERVAL '12 months'
GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
ORDER BY month ASC
```

### Pattern 2: Daily Stats

```sql
-- ✅ CORRECT
SELECT
  DATE("createdAt") as day,
  SUM(amount) as daily_amount,
  COUNT(*) as daily_count
FROM transactions
WHERE "userId" = ${userId}
  AND "createdAt" >= ${startDate.toISOString()}::timestamp
  AND "createdAt" <= ${endDate.toISOString()}::timestamp
GROUP BY DATE("createdAt")
ORDER BY day ASC
```

### Pattern 3: Category Grouping

```sql
-- ✅ CORRECT
SELECT
  TO_CHAR("createdAt", 'YYYY-MM') as month,
  category,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions
WHERE "userId" = ${userId}
  AND "createdAt" >= NOW() - INTERVAL '6 months'
GROUP BY TO_CHAR("createdAt", 'YYYY-MM'), category
ORDER BY month ASC, category ASC
```

### Pattern 4: Recent Records (30 days)

```sql
-- ✅ CORRECT
SELECT *
FROM transactions
WHERE "userId" = ${userId}
  AND "createdAt" >= NOW() - INTERVAL '30 days'
ORDER BY "createdAt" DESC
```

### Pattern 5: Date Range Filter

```sql
-- ✅ CORRECT
SELECT *
FROM transactions
WHERE "userId" = ${userId}
  AND date >= ${startDate.toISOString()}::timestamp
  AND date <= ${endDate.toISOString()}::timestamp
ORDER BY date DESC
```

---

## ❌ Common Mistakes

### Mistake 1: Unescaped camelCase Columns

```sql
-- ❌ WRONG
WHERE userId = ${userId}

-- ✅ CORRECT
WHERE "userId" = ${userId}
```

### Mistake 2: SQLite Date Functions

```sql
-- ❌ WRONG
WHERE createdAt >= date('now', '-12 months')

-- ✅ CORRECT
WHERE "createdAt" >= NOW() - INTERVAL '12 months'
```

### Mistake 3: strftime() for Date Formatting

```sql
-- ❌ WRONG
SELECT strftime('%Y-%m', date) as month

-- ✅ CORRECT
SELECT TO_CHAR(date, 'YYYY-MM') as month
```

### Mistake 4: Missing Timestamp Casting

```sql
-- ❌ WRONG (may work but not explicit)
WHERE createdAt >= ${date.toISOString()}

-- ✅ CORRECT (explicit casting)
WHERE "createdAt" >= ${date.toISOString()}::timestamp
```

### Mistake 5: Unquoted Reserved Words

```sql
-- ❌ WRONG
SELECT user, order FROM users

-- ✅ CORRECT
SELECT "user", "order" FROM users
```

---

## 🎯 Best Practices

### 1. Always Escape camelCase Columns

```sql
-- Use double quotes for camelCase
"userId", "createdAt", "updatedAt", "sessionId"

-- No quotes needed for snake_case or lowercase
user_id, created_at, amount, category
```

### 2. Use Explicit Timestamp Casting

```sql
-- Always cast ISO strings to timestamp
WHERE "createdAt" >= ${date.toISOString()}::timestamp
```

### 3. Use INTERVAL for Date Arithmetic

```sql
-- PostgreSQL INTERVAL syntax
NOW() - INTERVAL '1 day'
NOW() - INTERVAL '7 days'
NOW() - INTERVAL '1 month'
NOW() - INTERVAL '6 months'
NOW() - INTERVAL '1 year'
```

### 4. Use TO_CHAR for Date Formatting

```sql
-- Common formats
TO_CHAR(date, 'YYYY-MM')           -- 2024-09
TO_CHAR(date, 'YYYY-MM-DD')        -- 2024-09-30
TO_CHAR(date, 'YYYY')              -- 2024
TO_CHAR(date, 'Month YYYY')        -- September 2024
TO_CHAR(date, 'Day, DD Mon YYYY')  -- Monday, 30 Sep 2024
```

### 5. Handle PostgreSQL Return Types

```javascript
// COUNT() returns bigint
const count = BigInt(row.transaction_count);

// SUM() returns string (decimal)
const total = parseFloat(row.total_amount);

// Dates are returned as Date objects
const date = row.date; // Already a Date object
```

---

## 🧪 Testing

### Manual Test Query

```sql
-- Test in PostgreSQL shell
psql -d pluqla_production -U postgres

-- Run query
SELECT
  TO_CHAR("createdAt", 'YYYY-MM') as month,
  COUNT(*) as count
FROM transactions
WHERE "userId" = 'YOUR_USER_ID'
  AND "createdAt" >= NOW() - INTERVAL '12 months'
GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
ORDER BY month ASC;
```

### Automated Test

```bash
# Run PostgreSQL query tests
npm test -- tests/integration/postgresql-queries.test.js
```

---

## 📚 TO_CHAR Format Codes

### Date Formats

| Code | Description | Example |
|------|-------------|---------|
| `YYYY` | 4-digit year | `2024` |
| `YY` | 2-digit year | `24` |
| `MM` | Month (01-12) | `09` |
| `Mon` | Abbreviated month | `Sep` |
| `Month` | Full month | `September` |
| `DD` | Day of month (01-31) | `30` |
| `D` | Day of week (1-7) | `2` |
| `Day` | Full day name | `Monday` |
| `Dy` | Abbreviated day | `Mon` |
| `Q` | Quarter | `3` |
| `WW` | Week of year | `39` |

### Time Formats

| Code | Description | Example |
|------|-------------|---------|
| `HH24` | Hour (00-23) | `14` |
| `HH` or `HH12` | Hour (01-12) | `02` |
| `MI` | Minute (00-59) | `30` |
| `SS` | Second (00-59) | `45` |
| `MS` | Millisecond (000-999) | `123` |
| `AM` or `PM` | Meridiem | `PM` |

### Combined Formats

| Format | Output |
|--------|--------|
| `'YYYY-MM-DD'` | `2024-09-30` |
| `'YYYY-MM-DD HH24:MI:SS'` | `2024-09-30 14:30:45` |
| `'DD/MM/YYYY'` | `30/09/2024` |
| `'Month DD, YYYY'` | `September 30, 2024` |
| `'Dy, DD Mon YYYY'` | `Mon, 30 Sep 2024` |
| `'HH24:MI'` | `14:30` |

---

## ⚡ Performance Tips

### Use Indexes

```sql
-- Ensure indexes exist for frequent queries
CREATE INDEX idx_transactions_user_created
  ON transactions("userId", "createdAt");

CREATE INDEX idx_transactions_category
  ON transactions(category);

CREATE INDEX idx_analytics_user_timestamp
  ON analytics_events("userId", timestamp);
```

### Avoid Functions in WHERE Clause

```sql
-- ❌ SLOW (function on column)
WHERE TO_CHAR("createdAt", 'YYYY-MM') = '2024-09'

-- ✅ FAST (direct comparison)
WHERE "createdAt" >= '2024-09-01'::timestamp
  AND "createdAt" < '2024-10-01'::timestamp
```

### Use EXPLAIN ANALYZE

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT
  TO_CHAR("createdAt", 'YYYY-MM') as month,
  COUNT(*) as count
FROM transactions
WHERE "userId" = 'YOUR_USER_ID'
GROUP BY TO_CHAR("createdAt", 'YYYY-MM');
```

---

## 🔍 Debugging

### Check Query Plan

```sql
EXPLAIN
SELECT * FROM transactions
WHERE "userId" = 'YOUR_USER_ID'
  AND "createdAt" >= NOW() - INTERVAL '30 days';
```

### Find Slow Queries

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%transactions%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Check Active Queries

```sql
SELECT
  pid,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;
```

---

## 📖 Resources

- **PostgreSQL Docs**: https://www.postgresql.org/docs/current/
- **Date/Time Functions**: https://www.postgresql.org/docs/current/functions-datetime.html
- **TO_CHAR Formats**: https://www.postgresql.org/docs/current/functions-formatting.html
- **Prisma PostgreSQL**: https://www.prisma.io/docs/concepts/database-connectors/postgresql

---

## ✅ Checklist for New Raw SQL Queries

When writing a new raw SQL query with Prisma:

- [ ] Use `TO_CHAR()` for date formatting, not `strftime()`
- [ ] Use `NOW() - INTERVAL 'X'` for date arithmetic, not `date('now', '-X')`
- [ ] Escape all camelCase column names with double quotes
- [ ] Cast ISO string parameters with `::timestamp`
- [ ] Test query in PostgreSQL shell before deploying
- [ ] Add test case to `postgresql-queries.test.js`
- [ ] Verify indexes exist for filtered columns
- [ ] Check query performance with `EXPLAIN ANALYZE`

---

**Last Updated**: September 30, 2025
**Maintained by**: Pluqla Dev Team