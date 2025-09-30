# 🤝 Guide de Collaboration - Pluqla

Instructions pour une collaboration sécurisée et efficace entre développeurs.

---

## 🔐 Sécurité & Bonnes Pratiques

### ❌ À NE JAMAIS FAIRE
- Commiter des fichiers `.env` avec de vraies clés API
- Pousser des bases de données avec des données réelles
- Exposer des secrets dans le code
- Commiter des `node_modules/`
- Laisser des `console.log()` avec des données sensibles

### ✅ À TOUJOURS FAIRE
- Utiliser les fichiers `.env.example` comme référence
- Générer des secrets forts (32+ caractères)
- Tester en local avant de pousser
- Faire des commits atomiques et clairs
- Respecter le workflow Git défini

---

## 🌿 Workflow Git

### Structure des Branches
```
main                    # Production stable
├── develop            # Intégration & tests
├── feature/*          # Nouvelles fonctionnalités
├── hotfix/*           # Corrections urgentes
└── release/*          # Préparation des releases
```

### Cycle de Développement Standard

#### 1️⃣ Nouvelle Fonctionnalité
```bash
# Se placer sur develop et synchroniser
git checkout develop
git pull origin develop

# Créer une branche feature
git checkout -b feature/nom-fonctionnalite

# Développer...
git add .
git commit -m "feat: description claire"

# Pousser la branche
git push origin feature/nom-fonctionnalite

# Créer une Pull Request : feature/nom → develop
```

#### 2️⃣ Correction de Bug
```bash
git checkout develop
git pull origin develop
git checkout -b fix/description-bug

# Correction...
git commit -m "fix: correction du bug XYZ"
git push origin fix/description-bug

# Pull Request : fix/description → develop
```

#### 3️⃣ Hotfix Urgent
```bash
git checkout main
git pull origin main
git checkout -b hotfix/description-urgente

# Correction urgente...
git commit -m "hotfix: correction critique ABC"
git push origin hotfix/description-urgente

# Pull Request : hotfix/description → main ET develop
```

---

## 📝 Convention des Commits

### Format Standard
```
type(scope): description

[body optionnel]

[footer optionnel]
```

### Types de Commits
- **feat**: Nouvelle fonctionnalité
- **fix**: Correction de bug
- **docs**: Documentation
- **style**: Formatage (pas de changement de logique)
- **refactor**: Refactoring (pas de nouvelle feature ni fix)
- **test**: Ajout/modification de tests
- **chore**: Maintenance (deps, config, etc.)
- **perf**: Amélioration de performance
- **ci**: CI/CD

### Exemples
```bash
feat(auth): add OAuth Google login
fix(api): resolve user registration validation error
docs(readme): update installation instructions
style(client): format code with prettier
refactor(server): extract user service logic
test(auth): add unit tests for JWT validation
chore(deps): update React to v18.2.0
```

---

## 🔍 Code Review

### Checklist Obligatoire

#### ✅ Avant de Demander une Review
- [ ] Tests unitaires ajoutés/mis à jour
- [ ] Tests passants en local
- [ ] Linting sans erreur (`npm run lint`)
- [ ] Build réussi (`npm run build`)
- [ ] Pas de `console.log()` oubliés
- [ ] Documentation mise à jour si nécessaire
- [ ] Variables d'env ajoutées aux `.env.example`

#### ✅ Pendant la Review
- [ ] Code lisible et bien commenté
- [ ] Respect des conventions du projet
- [ ] Pas de duplication de code
- [ ] Gestion d'erreurs appropriée
- [ ] Performance non dégradée
- [ ] Sécurité respectée

### Template Pull Request
```markdown
## 🎯 Objectif
Description claire de ce qui a été fait.

## 🔧 Changements
- [ ] Fonctionnalité A ajoutée
- [ ] Bug B corrigé
- [ ] Tests C mis à jour

## 🧪 Tests
- [ ] Tests unitaires passants
- [ ] Tests E2E validés
- [ ] Tests manuels effectués

## 📋 Checklist
- [ ] Linting passant
- [ ] Build réussi
- [ ] Documentation mise à jour
- [ ] Variables d'env documentées

## 📸 Screenshots (si UI)
[Ajouter captures d'écran si changements visuels]
```

---

## 🛠️ Setup Développeur

### Configuration Git
```bash
# Configuration utilisateur
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"

# Configuration éditeur
git config --global core.editor "code --wait"

# Configuration merge tool
git config --global merge.tool vscode
```

### Hooks Git Recommandés
```bash
# Pre-commit hook (optionnel)
# Ajouter dans .git/hooks/pre-commit
#!/bin/sh
npm run lint && npm test
```

---

## 🚨 Gestion des Conflits

### Résolution de Conflits
```bash
# Récupérer les derniers changements
git fetch origin

# Merger develop dans votre branche
git checkout feature/votre-branche
git merge origin/develop

# Résoudre les conflits manuellement
# puis
git add .
git commit -m "resolve: merge conflicts with develop"
```

### Éviter les Conflits
- Synchroniser régulièrement avec `develop`
- Faire des commits fréquents et atomiques
- Communiquer sur les zones de code modifiées

---

## 📦 Gestion des Dépendances

### Ajout de Nouvelles Dépendances
```bash
# Client
cd client
npm install nouvelle-dependance
npm install --save-dev nouvelle-dev-dependance

# Server
cd server
npm install nouvelle-dependance

# Commiter package.json ET package-lock.json
git add package*.json
git commit -m "deps: add nouvelle-dependance for feature X"
```

### Mise à Jour des Dépendances
```bash
# Vérifier les mises à jour disponibles
npm outdated

# Mettre à jour (avec prudence)
npm update

# Tester après mise à jour
npm test
npm run build
```

---

## 🔄 Environnements

### Development
- **Branch** : `develop`
- **Auto-deploy** : Non
- **Base de données** : SQLite locale
- **Debug** : Activé

### Staging
- **Branch** : `develop`
- **Auto-deploy** : Oui
- **Base de données** : PostgreSQL
- **Debug** : Activé

### Production
- **Branch** : `main`
- **Auto-deploy** : Oui (après validation)
- **Base de données** : PostgreSQL
- **Debug** : Désactivé

---

## 📞 Communication

### Channels de Communication
- **Issues GitHub** : Bugs, features, questions techniques
- **Pull Requests** : Code reviews, discussions sur le code
- **Slack/Discord** : Communication quotidienne (optionnel)

### Reporting de Bugs
```markdown
**Environnement** : [Development/Staging/Production]
**Navigateur** : [Chrome/Firefox/Safari] version X
**OS** : [Windows/Mac/Linux]

**Description** :
Comportement attendu vs comportement observé

**Étapes pour reproduire** :
1. Aller sur la page X
2. Cliquer sur Y
3. Observer Z

**Captures d'écran** :
[Si applicable]

**Logs/Erreurs** :
[Copier les erreurs de la console]
```

---

## 🎯 Objectifs de Qualité

### Métriques Cibles
- **Coverage Tests** : ≥ 85%
- **Performance** : Lighthouse ≥ 90
- **Sécurité** : 0 vulnérabilités critiques
- **Linting** : 0 erreurs
- **Build Time** : < 2 minutes

### Outils de Monitoring
- **Tests** : Jest + Playwright
- **Linting** : ESLint + Prettier
- **Security** : npm audit
- **Performance** : Lighthouse CI

---

## 🚀 Déploiement

### Checklist Pre-Deploy
- [ ] Tests E2E passants
- [ ] Build production réussi
- [ ] Variables d'env production configurées
- [ ] Base de données migrée
- [ ] Backup DB effectué
- [ ] Monitoring actif

### Rollback Procedure
```bash
# En cas de problème en production
git checkout main
git revert <commit-problematique>
git push origin main

# Ou rollback complet vers version précédente
git reset --hard <commit-stable>
git push origin main --force-with-lease
```

---

**Version** : 1.0.0 | **Dernière MAJ** : Septembre 2024 | **Équipe** : Pluqla Dev Team