# Pluqla Compliance Documentation

## Overview

This document outlines Pluqla's compliance with **GDPR** (General Data Protection Regulation) and **PSD2** (Payment Services Directive 2) regulations. Our implementation ensures legal compliance, data protection, and secure financial transactions.

---

## Table of Contents

1. [GDPR Compliance](#gdpr-compliance)
2. [PSD2 Compliance](#psd2-compliance)
3. [Implementation Details](#implementation-details)
4. [API Endpoints](#api-endpoints)
5. [Testing & Verification](#testing--verification)
6. [Audit & Monitoring](#audit--monitoring)

---

## GDPR Compliance

### Legal Basis

Pluqla processes personal data under the following legal bases:

- **Consent** (Article 6(1)(a)): User consent for data processing, marketing, analytics
- **Contract** (Article 6(1)(b)): Processing necessary for service delivery
- **Legal Obligation** (Article 6(1)(c)): Compliance with financial regulations
- **Legitimate Interest** (Article 6(1)(f)): Fraud prevention, service improvement

### Data Protection Principles

#### 1. Right to Erasure (Article 17)

**Implementation:** `DELETE /api/compliance/user/delete-account`

**Behavior:**
- ✅ Anonymizes personal data instead of hard deletion
- ✅ Preserves audit trail for legal/regulatory requirements
- ✅ Deletes all active sessions
- ✅ Revokes all refresh tokens
- ✅ Logs deletion in `dataProcessingLog`

**Anonymization Strategy:**
```javascript
{
  email: "deleted-{timestamp}@anonymized.local",
  password: "DELETED",
  name: "Deleted User",
  status: "deleted",
  emailVerified: false,
  emailVerificationToken: null,
  lastLoginAt: null,
  lastScaAt: null
}
```

**Why Anonymization vs Hard Deletion?**
- Legal requirement to maintain financial transaction history
- Audit trail for regulatory compliance (PSD2, anti-money laundering)
- Anonymized data cannot be linked back to individual
- Satisfies GDPR Article 17 "right to be forgotten"

#### 2. Right to Data Portability (Article 20)

**Implementation:** `GET /api/compliance/user/export-data`

**Features:**
- ✅ Machine-readable JSON format
- ✅ Complete user data export
- ✅ Excludes sensitive fields (password, tokens)
- ✅ Includes metadata for transparency
- ✅ Downloadable as attachment

**Exported Data Categories:**
```javascript
{
  exportedAt: "ISO 8601 timestamp",
  format: "JSON",
  gdprCompliant: true,
  dataController: "Pluqla",
  userData: {
    // Profile
    id, email, name, status, isPremium, ...

    // Financial Data
    transactions: [...],
    expenses: [...],
    budgetPlans: [...],
    accounts: [...],
    assets: [...],
    liabilities: [...],
    incomes: [...],
    financialGoals: [...],

    // User Preferences
    answers: [...],
    badges: [...],
    dailyChallenges: [...],
    favoriteRecipes: [...],

    // Consent & Compliance
    consents: [...],
    refreshTokens: [...],
    betterAuthSessions: [...]
  }
}
```

#### 3. Data Processing Logs (Article 30)

**Implementation:** `dataProcessingLog` table

**Tracked Operations:**
- `CREATE` - User registration, data creation
- `READ` - Data access, exports
- `UPDATE` - Profile modifications
- `DELETE` - Account deletion, data removal
- `EXPORT` - GDPR data portability requests

**Log Fields:**
```javascript
{
  userId: "User ID",
  operation: "CREATE | READ | UPDATE | DELETE | EXPORT",
  dataType: "personal | financial | behavioral",
  description: "Human-readable description",
  legalBasis: "consent | contract | legal_obligation | user_request",
  ipAddress: "Request IP",
  userAgent: "Request user agent",
  success: true/false,
  errorMessage: "Error details if failed",
  timestamp: "ISO 8601"
}
```

#### 4. Consent Management

**Implementation:** `userConsent` table

**Consent Types:**
- `data_processing` - General data processing
- `marketing` - Marketing communications
- `analytics` - Usage analytics
- `financial_aggregation` - Bank data access

**Consent Attributes:**
- Version tracking (`version` field)
- Timestamp recording (`grantedAt`, `withdrawnAt`)
- IP/User-Agent logging for proof
- Purpose specification
- Legal basis documentation

---

## PSD2 Compliance

### Strong Customer Authentication (SCA)

**Article 97 Implementation**

#### 1. Transaction Threshold Enforcement

**Rule:** Transactions exceeding €30 require SCA

**Implementation:**
```javascript
const SCA_THRESHOLD_AMOUNT = 30; // €30

if (amount > SCA_THRESHOLD_AMOUNT) {
  // Trigger SCA challenge
  requireSCA = true;
}
```

**API Endpoint:** `POST /api/sca/check-requirement`

**Response:**
```json
{
  "scaRequired": true,
  "scaCheck": {
    "required": true,
    "reason": "amount_exceeds_threshold",
    "threshold": 30
  },
  "exemption": {
    "exempt": false,
    "reason": "No exemption criteria met"
  },
  "psd2Compliant": true
}
```

#### 2. 90-Day Re-authentication Requirement

**Rule:** Users must re-authenticate every 90 days

**Implementation:**
```javascript
const SCA_REAUTHENTICATION_DAYS = 90;

const daysSinceLastSca = (Date.now() - lastScaAt) / (1000 * 60 * 60 * 24);

if (daysSinceLastSca > SCA_REAUTHENTICATION_DAYS) {
  requireSCA = true;
  reason = "sca_expired";
}
```

**Database Field:** `User.lastScaAt` - Tracks last SCA timestamp

**Update Logic:**
- Updated on successful SCA challenge completion
- Updated on password change
- Updated on biometric authentication

#### 3. SCA Exemptions

**Exemption Types:**

##### Low Value (≤ €30)
```javascript
{
  "exempt": true,
  "exemptionType": "low_value",
  "reason": "Transaction amount (€25) is below SCA threshold (€30)"
}
```

##### Trusted Beneficiary
```javascript
{
  "exempt": true,
  "exemptionType": "trusted_beneficiary",
  "reason": "Beneficiary is in user trusted list"
}
```

##### Recurring Payment
```javascript
{
  "exempt": true,
  "exemptionType": "recurring_payment",
  "reason": "Recognized recurring payment to same merchant"
}
```

##### Low Risk Transaction
```javascript
{
  "exempt": true,
  "exemptionType": "low_risk",
  "reason": "Low risk score: 0.15"
}
```

**Exemption Logging:**

All exemptions are logged in `scaExemptionLog` for compliance audit:

```javascript
{
  userId: "User ID",
  transactionId: "Transaction ID",
  exemptionType: "low_value | trusted_beneficiary | recurring_payment | low_risk",
  amount: 25.0,
  reason: "Detailed exemption reason",
  riskScore: 0.15,
  ipAddress: "Request IP",
  userAgent: "Request user agent",
  createdAt: "Timestamp"
}
```

#### 4. SCA Challenge Flow

**Step 1: Create Challenge**

`POST /api/sca/create-challenge`

```json
{
  "transactionId": "txn_12345",
  "amount": 75.0,
  "allowedMethods": ["password", "biometric"]
}
```

**Response:**
```json
{
  "success": true,
  "challenge": {
    "id": "chal_abc123",
    "transactionId": "txn_12345",
    "allowedMethods": ["password", "biometric"],
    "expiresAt": "2025-10-01T12:05:00Z",
    "expiresIn": 300
  }
}
```

**Step 2: Complete Challenge**

`POST /api/sca/complete-challenge`

```json
{
  "challengeId": "chal_abc123",
  "verificationMethod": "password",
  "credentials": {
    "password": "user_password"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "SCA challenge completed successfully"
}
```

**Step 3: Process Transaction**

After successful SCA, proceed with transaction.

#### 5. Two-Factor Authentication (2FA)

**PSD2 Requirement:** Two of three authentication factors

**Factors:**
1. **Knowledge** - Something you know (password, PIN)
2. **Possession** - Something you have (mobile device, hardware token)
3. **Inherence** - Something you are (biometric - fingerprint, face ID)

**Implementation:**
```javascript
{
  requiredFactors: 2,
  allowedMethods: ["password", "biometric"]
}
```

---

## Implementation Details

### Database Schema

#### New Tables

**ScaExemptionLog**
```prisma
model ScaExemptionLog {
  id              String   @id @default(cuid())
  userId          String
  transactionId   String
  exemptionType   String
  amount          Float
  reason          String
  riskScore       Float?
  ipAddress       String?
  userAgent       String?
  metadata        String?
  createdAt       DateTime @default(now())
}
```

**User Schema Update**
```prisma
model User {
  // ... existing fields
  lastScaAt DateTime? // PSD2: Last SCA authentication timestamp
}
```

### Service Layer

**scaService.js** - PSD2 SCA logic
- `requiresSCA(userId, amount, transactionType)` - Check if SCA required
- `checkScaExemption(userId, amount, transactionData)` - Check exemptions
- `logScaExemption(userId, transactionId, exemptionData, req)` - Log exemptions
- `createScaChallenge(userId, transactionId, allowedMethods)` - Create challenge
- `completeScaChallenge(challengeId, verificationMethod)` - Complete challenge
- `calculateRiskScore(userId, transactionData)` - Risk assessment

**complianceController.js** - GDPR endpoints
- `deleteAccount(req, res)` - Account deletion with anonymization
- `exportUserData(req, res)` - Data portability export
- `getProcessingLogs(req, res)` - Admin: view processing logs

---

## API Endpoints

### GDPR Endpoints

#### Delete Account
```
DELETE /api/compliance/user/delete-account
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Account deleted successfully. All personal data has been anonymized."
}
```

#### Export User Data
```
GET /api/compliance/user/export-data
Authorization: Bearer <token>

Response: 200 OK
Content-Disposition: attachment; filename="pluqla-data-export-{userId}-{timestamp}.json"

{
  "exportedAt": "2025-10-01T12:00:00Z",
  "format": "JSON",
  "gdprCompliant": true,
  "userData": { ... }
}
```

#### Get Processing Logs (Admin)
```
GET /api/compliance/admin/processing-logs?page=1&limit=50&userId=xxx&operation=DELETE
Authorization: Bearer <admin-token>

Response: 200 OK
{
  "success": true,
  "data": {
    "logs": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

### PSD2 SCA Endpoints

#### Check SCA Requirement
```
POST /api/sca/check-requirement
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50.0,
  "transactionType": "payment",
  "transactionData": {
    "merchant": "Amazon",
    "isRecurring": false
  }
}

Response: 200 OK
{
  "scaRequired": true,
  "scaCheck": { ... },
  "exemption": { ... },
  "psd2Compliant": true
}
```

#### Create SCA Challenge
```
POST /api/sca/create-challenge
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionId": "txn_12345",
  "amount": 75.0,
  "allowedMethods": ["password", "biometric"]
}

Response: 201 Created
{
  "success": true,
  "challenge": { ... }
}
```

#### Complete SCA Challenge
```
POST /api/sca/complete-challenge
Authorization: Bearer <token>
Content-Type: application/json

{
  "challengeId": "chal_abc123",
  "verificationMethod": "password",
  "credentials": { ... }
}

Response: 200 OK
{
  "success": true,
  "message": "SCA challenge completed successfully"
}
```

#### Get SCA Exemption Logs (Admin)
```
GET /api/sca/exemptions?page=1&limit=50&userId=xxx&exemptionType=low_value
Authorization: Bearer <admin-token>

Response: 200 OK
{
  "success": true,
  "data": {
    "logs": [...],
    "pagination": { ... }
  }
}
```

---

## Testing & Verification

### Test Suites

#### GDPR Deletion Tests
**File:** `tests/gdprDeletion.test.js`

**Coverage:**
- ✅ Anonymize user data instead of hard deletion
- ✅ Delete all active sessions
- ✅ Revoke all refresh tokens
- ✅ Create data processing log
- ✅ Preserve transaction history
- ✅ Prevent future login
- ✅ Make personal data unrecoverable

#### GDPR Export Tests
**File:** `tests/gdprExport.test.js`

**Coverage:**
- ✅ Export all user data in JSON format
- ✅ Include user profile data
- ✅ Exclude sensitive fields
- ✅ Include transaction history
- ✅ Include consent records
- ✅ Include financial data
- ✅ Create data processing log
- ✅ Set correct download headers
- ✅ Handle large exports

#### PSD2 SCA Tests
**File:** `tests/psd2Sca.test.js`

**Coverage:**
- ✅ SCA threshold enforcement (€30)
- ✅ 90-day re-authentication requirement
- ✅ Exemption handling (low value, low risk, recurring, trusted)
- ✅ SCA challenge creation
- ✅ SCA challenge completion
- ✅ Update lastScaAt timestamp
- ✅ Challenge expiration
- ✅ Lockout after 3 attempts
- ✅ Exemption logging
- ✅ Two-factor authentication

### Running Tests

```bash
# Run all compliance tests
npm test -- --testPathPattern=gdpr
npm test -- --testPathPattern=psd2

# Run specific test file
npm test tests/gdprDeletion.test.js
npm test tests/gdprExport.test.js
npm test tests/psd2Sca.test.js

# Run with coverage
npm test -- --coverage
```

### Manual Verification

#### GDPR Deletion
```bash
# Authenticate user
TOKEN=$(curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}' \
  | jq -r '.token')

# Delete account
curl -X DELETE http://localhost:3004/api/compliance/user/delete-account \
  -H "Authorization: Bearer $TOKEN"

# Verify anonymization in database
psql -d pluqla_dev -c "SELECT email, name, status FROM users WHERE email LIKE 'deleted-%@anonymized.local';"
```

#### GDPR Export
```bash
# Export user data
curl http://localhost:3004/api/compliance/user/export-data \
  -H "Authorization: Bearer $TOKEN" \
  -o user-data-export.json

# Verify JSON structure
cat user-data-export.json | jq '.userData | keys'
```

#### PSD2 SCA
```bash
# Check SCA requirement for transaction
curl -X POST http://localhost:3004/api/sca/check-requirement \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":50.0,"transactionType":"payment"}'

# Create SCA challenge
curl -X POST http://localhost:3004/api/sca/create-challenge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transactionId":"test-123","amount":75.0}'
```

---

## Audit & Monitoring

### Compliance Monitoring

#### Key Metrics

1. **GDPR Metrics**
   - Account deletion requests (daily/weekly/monthly)
   - Data export requests (daily/weekly/monthly)
   - Processing log volume
   - Consent grant/withdrawal rate

2. **PSD2 Metrics**
   - SCA challenges created
   - SCA challenges completed/failed
   - Exemption usage by type
   - Average risk scores
   - 90-day re-authentication compliance

#### Monitoring Queries

**Account Deletions (Last 30 Days)**
```sql
SELECT COUNT(*)
FROM data_processing_logs
WHERE operation = 'DELETE'
  AND data_type = 'personal'
  AND timestamp > NOW() - INTERVAL '30 days';
```

**SCA Exemptions by Type**
```sql
SELECT exemption_type, COUNT(*)
FROM sca_exemption_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY exemption_type;
```

**Users Needing Re-authentication**
```sql
SELECT COUNT(*)
FROM users
WHERE last_sca_at < NOW() - INTERVAL '90 days'
  AND status = 'active';
```

### Compliance Reports

#### Weekly Report
- Total account deletions
- Total data exports
- SCA challenge success rate
- Exemption breakdown
- Failed compliance events

#### Monthly Report
- GDPR request volume trends
- PSD2 SCA statistics
- Risk score distribution
- Consent management metrics
- Regulatory incidents (if any)

### Alerts

**Critical Alerts:**
- ❗ Failed account deletion (manual intervention required)
- ❗ Data export error (compliance deadline risk)
- ❗ SCA challenge lockout spike (potential attack)

**Warning Alerts:**
- ⚠️ High volume of deletion requests (anomaly detection)
- ⚠️ Unusual exemption patterns
- ⚠️ Many users exceeding 90-day SCA limit

---

## Data Retention Policies

### Active Users
- **Personal Data:** Retained while account active
- **Transaction History:** Indefinite (financial regulation compliance)
- **Processing Logs:** 3 years (GDPR Article 30)
- **SCA Challenges:** 90 days after completion

### Deleted Accounts
- **Anonymized Profile:** Retained indefinitely (audit trail)
- **Transaction History:** Retained indefinitely (linked to anonymized ID)
- **Processing Logs:** 3 years minimum
- **Sessions/Tokens:** Deleted immediately

### Automated Cleanup

```sql
-- Cleanup expired SCA challenges (run daily)
DELETE FROM sca_challenges
WHERE status IN ('completed', 'expired')
  AND created_at < NOW() - INTERVAL '90 days';

-- Cleanup expired processing logs (run monthly)
DELETE FROM data_processing_logs
WHERE timestamp < NOW() - INTERVAL '3 years';
```

---

## Legal Compliance Checklist

### GDPR Compliance ✅

- [x] **Article 6** - Lawfulness of processing (multiple legal bases)
- [x] **Article 13/14** - Information to be provided (privacy policy)
- [x] **Article 15** - Right of access (data export endpoint)
- [x] **Article 17** - Right to erasure (account deletion with anonymization)
- [x] **Article 20** - Right to data portability (JSON export)
- [x] **Article 25** - Data protection by design (security measures)
- [x] **Article 30** - Records of processing activities (data processing logs)
- [x] **Article 32** - Security of processing (encryption, access control)

### PSD2 Compliance ✅

- [x] **Article 4(30)** - Strong customer authentication definition
- [x] **Article 97** - SCA requirements implementation
- [x] **RTS Chapter II** - SCA exemptions (low value, low risk, recurring)
- [x] **RTS Article 2** - Two authentication factors
- [x] **RTS Article 5** - Transaction risk analysis
- [x] **RTS Article 11** - Security measures
- [x] **RTS Article 14** - 90-day re-authentication
- [x] **RTS Article 18** - Trusted beneficiaries

---

## Support & Contact

For compliance-related questions:

- **Email:** compliance@pluqla.com
- **Data Protection Officer:** dpo@pluqla.com
- **Security Issues:** security@pluqla.com

---

**Last Updated:** October 1, 2025
**Version:** 1.0.0
**Review Cycle:** Quarterly
