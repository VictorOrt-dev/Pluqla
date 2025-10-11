-- Script SQL pour promouvoir un utilisateur existant vers Premium
-- Usage: Remplacer 'user@example.com' par l'email de l'utilisateur

-- Vérifier l'utilisateur existant
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

-- Promouvoir vers Premium (expire dans 1 an)
UPDATE "User"
SET
  "isPremium" = true,
  "subscriptionTier" = 'PREMIUM',
  "subscriptionStartDate" = NOW(),
  "subscriptionEndDate" = NOW() + INTERVAL '1 year',
  "updatedAt" = NOW()
WHERE email = 'user@example.com';

-- Vérification après upgrade
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

-- Afficher les limites Premium
SELECT
  'FREE' as tier,
  5 as requests_per_day,
  1000 as tokens_per_day
UNION ALL
SELECT
  'PREMIUM' as tier,
  50 as requests_per_day,
  10000 as tokens_per_day;
