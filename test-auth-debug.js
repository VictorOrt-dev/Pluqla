/**
 * Script de test et debug pour l'authentification
 * Teste inscription et login avec logs détaillés
 */

const http = require('http');

const BASE_URL = 'http://localhost:3004';

// Fonction helper pour faire des requêtes HTTP
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      }
    };

    console.log(`\n📤 ${method} ${url}`);
    if (data) {
      console.log(`📦 Body:`, JSON.stringify(data, null, 2));
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n📥 Response Status: ${res.statusCode}`);
        console.log(`📥 Response Headers:`, JSON.stringify(res.headers, null, 2));

        try {
          const parsed = JSON.parse(body);
          console.log(`📥 Response Body:`, JSON.stringify(parsed, null, 2));
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          console.log(`📥 Response Body (raw):`, body.substring(0, 500));
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`\n❌ Request Error:`, error.message);
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testRegistration() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST 1: INSCRIPTION (POST /api/auth/register)');
  console.log('='.repeat(80));

  const testEmail = `test-${Date.now()}@example.com`;
  const registrationData = {
    email: testEmail,
    password: 'TestPassword123!',
    name: 'Test User Debug'
  };

  try {
    const response = await makeRequest('POST', '/api/auth/register', registrationData);

    if (response.status === 201 || response.status === 200) {
      console.log('\n✅ Inscription réussie!');
      console.log(`   User ID: ${response.data.data?.user?.id || 'N/A'}`);
      console.log(`   Token: ${response.data.data?.token ? response.data.data.token.substring(0, 30) + '...' : 'N/A'}`);
      return {
        success: true,
        email: testEmail,
        password: registrationData.password,
        token: response.data.data?.token,
        user: response.data.data?.user
      };
    } else {
      console.log('\n❌ Inscription échouée');
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data.message || response.data.error || 'Unknown'}`);
      return {
        success: false,
        error: response.data
      };
    }
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error('   Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testLogin(email, password) {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST 2: CONNEXION (POST /api/auth/login)');
  console.log('='.repeat(80));

  const loginData = {
    email,
    password
  };

  try {
    const response = await makeRequest('POST', '/api/auth/login', loginData);

    if (response.status === 200) {
      console.log('\n✅ Connexion réussie!');
      console.log(`   User ID: ${response.data.data?.user?.id || 'N/A'}`);
      console.log(`   Token: ${response.data.data?.token ? response.data.data.token.substring(0, 30) + '...' : 'N/A'}`);
      return {
        success: true,
        token: response.data.data?.token,
        user: response.data.data?.user
      };
    } else {
      console.log('\n❌ Connexion échouée');
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data.message || response.data.error || 'Unknown'}`);
      return {
        success: false,
        error: response.data
      };
    }
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error('   Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testHealthCheck() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TEST 0: HEALTH CHECK');
  console.log('='.repeat(80));

  try {
    const response = await makeRequest('GET', '/health');

    if (response.status === 200) {
      console.log('\n✅ Serveur opérationnel');
      console.log(`   Database: ${response.data.subsystems?.database?.healthy ? 'OK' : 'KO'}`);
      console.log(`   Auth: ${response.data.subsystems?.auth?.healthy ? 'OK' : 'KO'}`);
      return { success: true };
    } else {
      console.log('\n⚠️ Serveur en erreur');
      return { success: false };
    }
  } catch (error) {
    console.error('\n❌ Serveur inaccessible:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n🚀 Démarrage des tests d\'authentification avec logs détaillés\n');

  try {
    // Test 0: Health Check
    const healthResult = await testHealthCheck();
    if (!healthResult.success) {
      console.log('\n❌ Le serveur n\'est pas accessible. Assurez-vous qu\'il tourne sur port 3004.');
      console.log('   Commande: cd server && npm run dev');
      process.exit(1);
    }

    // Test 1: Registration
    const registrationResult = await testRegistration();

    if (!registrationResult.success) {
      console.log('\n❌ Test d\'inscription échoué');
      console.log('\n📋 DIAGNOSTIC:');
      console.log('   - Vérifiez les logs du serveur pour voir l\'erreur exacte');
      console.log('   - Assurez-vous que PostgreSQL est actif');
      console.log('   - Vérifiez les variables d\'environnement (JWT_SECRET, etc.)');
      console.log('   - Vérifiez que les migrations Prisma sont appliquées');

      console.log('\n🔧 Commandes utiles:');
      console.log('   cd server');
      console.log('   npx prisma migrate status');
      console.log('   npx prisma migrate dev');
      console.log('   tail -f logs/app.log');

      process.exit(1);
    }

    // Test 2: Login
    const loginResult = await testLogin(registrationResult.email, registrationResult.password);

    if (!loginResult.success) {
      console.log('\n❌ Test de connexion échoué');
      console.log('\n📋 DIAGNOSTIC:');
      console.log('   - L\'utilisateur a été créé mais la connexion échoue');
      console.log('   - Vérifiez le hash du mot de passe');
      console.log('   - Vérifiez la génération des tokens JWT');
      process.exit(1);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ DES TESTS');
    console.log('='.repeat(80));
    console.log('✅ Health Check: PASS');
    console.log('✅ Inscription: PASS');
    console.log('✅ Connexion: PASS');
    console.log('\n🎉 Tous les tests d\'authentification passent avec succès!');
    console.log('\n📌 Compte de test créé:');
    console.log(`   Email: ${registrationResult.email}`);
    console.log(`   Password: ${registrationResult.password}`);
    console.log(`   Token: ${registrationResult.token?.substring(0, 50)}...`);

  } catch (error) {
    console.error('\n💥 Erreur fatale non capturée:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests().then(() => {
  console.log('\n✅ Script de test terminé\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Erreur fatale:', err);
  process.exit(1);
});
