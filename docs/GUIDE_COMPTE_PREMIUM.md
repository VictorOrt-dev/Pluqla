# 🔐 Guide: Se Connecter avec un Compte Premium

## 📋 3 Méthodes Disponibles

---

## ✅ Méthode 1: Script Node.js (RECOMMANDÉ)

### Créer un nouveau compte Premium

```bash
cd server
node scripts/create-premium-user.js
```

**Compte créé par défaut**:
- 📧 Email: `premium@test.com`
- 🔑 Password: `Premium123!`
- 👤 Nom: `Premium Test User`

### Créer avec tes propres identifiants

```bash
node scripts/create-premium-user.js "ton-email@exemple.com" "TonMotDePasse123!" "Ton Nom"
```

### Exemple complet

```bash
cd server
node scripts/create-premium-user.js "victor@pluqla.dev" "SecurePass2024!" "Victor Premium"
```

**Résultat attendu**:
```
🚀 Script de création de compte Premium

🔍 Vérification utilisateur existant...
👤 Création d'un nouvel utilisateur Premium...
✅ Utilisateur Premium créé avec succès!

============================================================
📋 Informations du compte Premium
============================================================
📧 Email: victor@pluqla.dev
🔑 Mot de passe: SecurePass2024!
👤 Nom: Victor Premium
🆔 User ID: cm1234567890abcdef
💎 Tier: PREMIUM
✨ Premium: OUI
📅 Début abonnement: 02/10/2025
📅 Fin abonnement: 02/10/2026
============================================================

📌 Limites Premium:
   - Requêtes AI: 50/jour (vs 5 pour Free)
   - Tokens: 10,000/jour (vs 1,000 pour Free)
   - Features exclusives: Photo Match, Transport Optimization
   - Cache prioritaire
   - Support prioritaire
```

---

## ✅ Méthode 2: Upgrade d'un Compte Existant

### Via Script Node.js

Si tu as déjà créé un compte via le frontend, tu peux l'upgrader:

```bash
cd server
node scripts/create-premium-user.js "ton-email-existant@exemple.com" "password" "Nom"
```

Le script détectera que l'utilisateur existe et le mettra à jour vers Premium.

### Via SQL Direct

1. **Connecte-toi à PostgreSQL**:
   ```bash
   psql -U pluqla -d pluqla_dev
   ```

2. **Exécute le script**:
   ```sql
   -- Remplace 'user@example.com' par ton email
   UPDATE "User"
   SET
     "isPremium" = true,
     "subscriptionTier" = 'PREMIUM',
     "subscriptionStartDate" = NOW(),
     "subscriptionEndDate" = NOW() + INTERVAL '1 year',
     "updatedAt" = NOW()
   WHERE email = 'user@example.com';
   ```

3. **Vérifie**:
   ```sql
   SELECT
     id,
     email,
     name,
     "isPremium",
     "subscriptionTier",
     "subscriptionStartDate",
     "subscriptionEndDate"
   FROM "User"
   WHERE email = 'user@example.com';
   ```

---

## ✅ Méthode 3: Via Prisma Studio (Interface Graphique)

### Lancer Prisma Studio

```bash
cd server
npx prisma studio
```

Cela ouvre une interface web sur **http://localhost:5555**

### Étapes dans Prisma Studio

1. **Cliquer sur le modèle `User`**
2. **Trouver ton utilisateur** (rechercher par email)
3. **Modifier les champs**:
   - `isPremium`: ✅ true
   - `subscriptionTier`: PREMIUM
   - `subscriptionStartDate`: (date du jour)
   - `subscriptionEndDate`: (date dans 1 an)
4. **Cliquer sur "Save 1 change"**

---

## 🔐 Se Connecter avec le Compte Premium

### Option A: Via le Frontend

1. **Ouvrir le frontend**: http://localhost:3000
2. **Aller sur la page Login**
3. **Entrer les identifiants**:
   - Email: `premium@test.com` (ou ton email)
   - Password: `Premium123!` (ou ton password)
4. **Cliquer sur "Se connecter"**

### Option B: Via l'API

**Requête**:
```bash
curl -X POST http://localhost:3004/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "premium@test.com",
    "password": "Premium123!"
  }'
```

**Réponse attendue**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm...",
      "email": "premium@test.com",
      "name": "Premium Test User",
      "isPremium": true,
      "subscriptionTier": "PREMIUM"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Utiliser le token pour les requêtes**:
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3004/api/meal-suggestions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mealType": "dinner",
    "servings": 2,
    "budget": 15
  }'
```

---

## 💎 Différences Free vs Premium

| Feature | Free (Gratuit) | Premium |
|---------|----------------|---------|
| **Requêtes AI/jour** | 5 | 50 |
| **Tokens/jour** | 1,000 | 10,000 |
| **MealSuggestions** | ✅ | ✅ |
| **PhotoMatch** | ❌ | ✅ |
| **Transport Optimization** | ✅ (limité) | ✅ |
| **Cache prioritaire** | ❌ | ✅ |
| **Historique étendu** | 30 jours | 1 an |
| **Support** | Standard | Prioritaire |
| **Analytics avancés** | ❌ | ✅ |

---

## 🧪 Tester les Features Premium

### 1. MealSuggestions (50 requêtes/jour)

```bash
curl -X POST http://localhost:3004/api/meal-suggestions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mealType": "dinner",
    "servings": 4,
    "budget": 20,
    "dietaryRestrictions": ["vegetarian"]
  }'
```

**Quota attendu**:
```json
{
  "quota": {
    "remainingRequests": 49,
    "totalRequests": 50,
    "remainingTokens": 9997,
    "totalTokens": 10000,
    "tier": "PREMIUM"
  }
}
```

### 2. PhotoMatch (Premium only)

```bash
curl -X POST http://localhost:3004/api/photo-match \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/photo.jpg",
    "metadata": { "source": "test" }
  }'
```

### 3. Transport Optimization (étendu en Premium)

```bash
curl -X POST http://localhost:3004/api/transport-optimize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Paris, France",
    "destination": "Lyon, France",
    "distance": 465,
    "recurring": true
  }'
```

---

## 🔍 Vérifier le Status Premium

### Via API

```bash
curl -X GET http://localhost:3004/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Réponse**:
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "email": "premium@test.com",
    "name": "Premium Test User",
    "isPremium": true,
    "subscriptionTier": "PREMIUM",
    "subscriptionStartDate": "2025-10-02T18:30:00.000Z",
    "subscriptionEndDate": "2026-10-02T18:30:00.000Z",
    "role": "user",
    "status": "active"
  }
}
```

### Via Base de Données

```bash
psql -U pluqla -d pluqla_dev -c "SELECT email, \"isPremium\", \"subscriptionTier\" FROM \"User\" WHERE email = 'premium@test.com';"
```

**Résultat attendu**:
```
       email       | isPremium | subscriptionTier
-------------------+-----------+------------------
 premium@test.com  | t         | PREMIUM
```

---

## 🚨 Troubleshooting

### Problème 1: "User not found"

**Cause**: Utilisateur pas encore créé

**Solution**:
```bash
cd server
node scripts/create-premium-user.js
```

### Problème 2: "Invalid credentials"

**Cause**: Mauvais mot de passe

**Solution**: Vérifier que tu utilises le bon mot de passe ou réinitialiser:
```bash
cd server
node scripts/create-premium-user.js "email@exemple.com" "NewPassword123!" "Nom"
```

### Problème 3: "Subscription expired"

**Cause**: Date d'expiration dépassée

**Solution**:
```sql
UPDATE "User"
SET "subscriptionEndDate" = NOW() + INTERVAL '1 year'
WHERE email = 'premium@test.com';
```

### Problème 4: "Quota exceeded"

**Cause**: Limites de requêtes atteintes

**Solution**: Attendre minuit (reset quotidien) ou réinitialiser manuellement:
```sql
DELETE FROM "AiUsage"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'premium@test.com');
```

---

## 📝 Comptes de Test Recommandés

### Compte 1: Premium Standard

```bash
node scripts/create-premium-user.js \
  "premium@test.com" \
  "Premium123!" \
  "Premium Test User"
```

### Compte 2: Admin Premium

```bash
node scripts/create-premium-user.js \
  "admin@pluqla.dev" \
  "AdminPremium2024!" \
  "Admin Premium"
```

Puis upgrader le rôle:
```sql
UPDATE "User"
SET role = 'admin'
WHERE email = 'admin@pluqla.dev';
```

### Compte 3: Enterprise Premium

```bash
node scripts/create-premium-user.js \
  "enterprise@test.com" \
  "Enterprise123!" \
  "Enterprise User"
```

Puis upgrader le tier:
```sql
UPDATE "User"
SET "subscriptionTier" = 'ENTERPRISE'
WHERE email = 'enterprise@test.com';
```

---

## ✅ Checklist de Vérification

Après création du compte Premium, vérifier:

- [ ] `isPremium = true`
- [ ] `subscriptionTier = 'PREMIUM'`
- [ ] `subscriptionStartDate` définie
- [ ] `subscriptionEndDate` dans le futur (au moins 1 an)
- [ ] Connexion réussie via frontend ou API
- [ ] Token JWT obtenu
- [ ] Quota affiche 50 requêtes/jour et 10,000 tokens/jour
- [ ] Accès aux features premium (PhotoMatch)
- [ ] Cache prioritaire actif

---

## 🎯 Résumé Rapide

**Pour créer et tester un compte Premium immédiatement**:

```bash
# 1. Créer le compte
cd server
node scripts/create-premium-user.js

# 2. Démarrer le serveur (si pas déjà fait)
npm run dev

# 3. Se connecter
curl -X POST http://localhost:3004/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"premium@test.com","password":"Premium123!"}'

# 4. Copier le token et tester une feature premium
curl -X POST http://localhost:3004/api/meal-suggestions \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -H "Content-Type: application/json" \
  -d '{"mealType":"dinner","servings":2}'
```

**C'est tout! Tu as maintenant un compte Premium fonctionnel! 🎉**

---

**Besoin d'aide?** Consulte les logs du serveur ou vérifie la base de données avec Prisma Studio.
