/**
 * Script de pruebas completas del servicio NLP
 * 
 * Ejecuta pruebas de conectividad y funcionalidad del servicio NLP v2
 * 
 * Uso:
 *   node scripts/test-comprehensive.js
 */

const axios = require('axios');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:3004';

// Colores para la terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHealthCheck() {
  log('\n📊 Test 1: Health Check', 'cyan');
  try {
    const response = await axios.get(`${NLP_SERVICE_URL}/health`);
    
    if (response.data.status === 'healthy') {
      log('✅ Health check passed', 'green');
      log(`   Uptime: ${response.data.uptime}s`);
      log(`   PostgreSQL: ${response.data.dependencies.postgresql ? '✅' : '❌'}`);
      log(`   Qdrant: ${response.data.dependencies.qdrant ? '✅' : '❌'}`);
      log(`   Gemini: ${response.data.dependencies.gemini ? '✅' : '❌'}`);
      return true;
    } else {
      log('⚠️ Service is degraded', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, 'red');
    return false;
  }
}

async function testStats() {
  log('\n📈 Test 2: Statistics', 'cyan');
  try {
    const response = await axios.get(`${NLP_SERVICE_URL}/stats`);
    
    if (response.data.success) {
      log('✅ Stats retrieved successfully', 'green');
      log(`   Total personas: ${response.data.stats.database.total_personas}`);
      log(`   Total embeddings: ${response.data.stats.embeddings.total_embeddings}`);
      log(`   Service version: ${response.data.stats.service.version}`);
      return true;
    }
    return false;
  } catch (error) {
    log(`❌ Stats test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testConnectivity() {
  log('\n🔌 Test 3: Component Connectivity', 'cyan');
  
  const tests = ['database', 'gemini', 'qdrant'];
  let allPassed = true;
  
  for (const test of tests) {
    try {
      const response = await axios.post(`${NLP_SERVICE_URL}/test`, {
        test_type: test
      });
      
      if (response.data.success) {
        log(`✅ ${test.toUpperCase()} connectivity OK`, 'green');
        const testResult = response.data.results.tests[test];
        if (testResult.response_time_ms) {
          log(`   Response time: ${testResult.response_time_ms}ms`);
        }
      } else {
        log(`❌ ${test.toUpperCase()} connectivity failed`, 'red');
        allPassed = false;
      }
    } catch (error) {
      log(`❌ ${test.toUpperCase()} test error: ${error.message}`, 'red');
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testBasicQuery() {
  log('\n🔍 Test 4: Basic NLP Query', 'cyan');
  try {
    const queries = [
      '¿Cuántas personas hay registradas?',
      '¿Cuál es la edad promedio?',
      'Muéstrame personas mayores de 30 años'
    ];
    
    let allPassed = true;
    
    for (const query of queries) {
      log(`\n   Query: "${query}"`, 'blue');
      
      const response = await axios.post(`${NLP_SERVICE_URL}/query`, {
        query: query
      }, {
        timeout: 30000
      });
      
      if (response.data.success) {
        log('   ✅ Query processed successfully', 'green');
        log(`   Intent: ${response.data.metadata.intent}`);
        log(`   Results: ${response.data.metadata.results_count}`);
        log(`   Processing time: ${response.data.metadata.processing_time_ms}ms`);
        log(`   Used semantic search: ${response.data.metadata.used_semantic_search ? 'Yes' : 'No'}`);
        
        // Mostrar primeras líneas de la respuesta Markdown
        const markdownLines = response.data.data.markdown.split('\n').slice(0, 3);
        log(`   Response preview: ${markdownLines.join(' ').substring(0, 100)}...`);
      } else {
        log(`   ❌ Query failed: ${response.data.error}`, 'red');
        allPassed = false;
      }
    }
    
    return allPassed;
  } catch (error) {
    log(`❌ Query test failed: ${error.message}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

async function testEmbeddingOperations() {
  log('\n🔢 Test 5: Embedding Operations', 'cyan');
  try {
    // Primero, obtener el ID de una persona
    const statsResponse = await axios.get(`${NLP_SERVICE_URL}/stats`);
    
    if (statsResponse.data.stats.database.total_personas === 0) {
      log('⚠️ No hay personas en la base de datos para probar embeddings', 'yellow');
      return true; // No es un error, simplemente no hay datos
    }
    
    // Actualizar embedding de la persona ID 1 (si existe)
    try {
      const updateResponse = await axios.post(`${NLP_SERVICE_URL}/update-embedding`, {
        persona_id: 1
      });
      
      if (updateResponse.data.success) {
        log('✅ Embedding update test passed', 'green');
        return true;
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        log('⚠️ Persona ID 1 no encontrada (normal si no hay datos)', 'yellow');
        return true;
      }
      throw error;
    }
    
    return false;
  } catch (error) {
    log(`❌ Embedding operations test failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('╔═══════════════════════════════════════════════════╗', 'cyan');
  log('║   Pruebas Completas del Servicio NLP v2.0        ║', 'cyan');
  log('╚═══════════════════════════════════════════════════╝', 'cyan');
  log(`\nURL del servicio: ${NLP_SERVICE_URL}\n`);
  
  const results = {
    healthCheck: false,
    stats: false,
    connectivity: false,
    basicQuery: false,
    embeddings: false
  };
  
  // Ejecutar pruebas
  results.healthCheck = await testHealthCheck();
  
  if (results.healthCheck) {
    results.stats = await testStats();
    results.connectivity = await testConnectivity();
    results.basicQuery = await testBasicQuery();
    results.embeddings = await testEmbeddingOperations();
  } else {
    log('\n⚠️ Health check failed, skipping other tests', 'yellow');
  }
  
  // Resumen
  log('\n' + '═'.repeat(60), 'cyan');
  log('📊 RESUMEN DE PRUEBAS', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  const testNames = {
    healthCheck: 'Health Check',
    stats: 'Statistics',
    connectivity: 'Connectivity',
    basicQuery: 'Basic Queries',
    embeddings: 'Embeddings'
  };
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const [key, value] of Object.entries(results)) {
    totalTests++;
    if (value) passedTests++;
    
    const status = value ? '✅ PASS' : '❌ FAIL';
    const color = value ? 'green' : 'red';
    log(`${testNames[key].padEnd(20)} ${status}`, color);
  }
  
  log('═'.repeat(60), 'cyan');
  log(`\nResultado: ${passedTests}/${totalTests} pruebas pasaron`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    log('\n🎉 Todas las pruebas pasaron exitosamente!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️ Algunas pruebas fallaron. Revisa los logs anteriores.', 'yellow');
    process.exit(1);
  }
}

// Ejecutar pruebas
runAllTests().catch(error => {
  log(`\n❌ Error crítico en las pruebas: ${error.message}`, 'red');
  process.exit(1);
});
