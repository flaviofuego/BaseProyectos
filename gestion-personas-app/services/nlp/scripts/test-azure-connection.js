#!/usr/bin/env node

/**
 * Script de prueba para verificar la conexión con Azure AI Foundry
 * 
 * Uso:
 *   node scripts/test-azure-connection.js
 */

require('dotenv').config();
const axios = require('axios');

const AZURE_FOUNDRY_ENDPOINT = process.env.AZURE_FOUNDRY_ENDPOINT;
const AZURE_EMBEDDING_MODEL = process.env.AZURE_EMBEDDING_MODEL;
const AZURE_CHAT_MODEL = process.env.AZURE_CHAT_MODEL;
const AZURE_API_KEY = process.env.AZURE_API_KEY;

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testConfiguration() {
  logSection('🔧 Verificando Configuración');
  
  const config = {
    endpoint: AZURE_FOUNDRY_ENDPOINT,
    embeddingModel: AZURE_EMBEDDING_MODEL,
    chatModel: AZURE_CHAT_MODEL,
    hasApiKey: !!AZURE_API_KEY
  };

  console.log(JSON.stringify(config, null, 2));

  if (!AZURE_FOUNDRY_ENDPOINT || !AZURE_API_KEY) {
    log('❌ Faltan variables de entorno necesarias', 'red');
    log('   Asegúrate de configurar AZURE_FOUNDRY_ENDPOINT y AZURE_API_KEY', 'yellow');
    return false;
  }

  log('✅ Configuración completa', 'green');
  return true;
}

async function testEmbedding() {
  logSection('🧪 Probando Generación de Embeddings');

  try {
    log('Enviando solicitud a Azure AI Foundry...', 'blue');
    
    const response = await axios.post(
      `${AZURE_FOUNDRY_ENDPOINT}/embeddings`,
      {
        model: AZURE_EMBEDDING_MODEL,
        input: 'Esta es una prueba de embedding',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_API_KEY,
        },
        timeout: 30000,
      }
    );

    const embedding = response.data.data[0].embedding;
    
    log(`✅ Embedding generado exitosamente`, 'green');
    log(`   Dimensión del vector: ${embedding.length}`, 'blue');
    log(`   Primeros 5 valores: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`, 'blue');
    log(`   Modelo usado: ${response.data.model}`, 'blue');
    
    return true;

  } catch (error) {
    log('❌ Error generando embedding', 'red');
    
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else if (error.request) {
      log('   No se recibió respuesta del servidor', 'red');
      log(`   Endpoint: ${AZURE_FOUNDRY_ENDPOINT}/embeddings`, 'yellow');
    } else {
      log(`   ${error.message}`, 'red');
    }
    
    return false;
  }
}

async function testChat() {
  logSection('💬 Probando Modelo de Chat');

  try {
    log('Enviando consulta al modelo de chat...', 'blue');
    
    const response = await axios.post(
      `${AZURE_FOUNDRY_ENDPOINT}/chat/completions`,
      {
        model: AZURE_CHAT_MODEL,
        messages: [
          { role: 'system', content: 'Eres un asistente útil.' },
          { role: 'user', content: 'Di "Hola, funciono correctamente" en una sola línea.' },
        ],
        temperature: 0.7,
        max_tokens: 50,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_API_KEY,
        },
        timeout: 30000,
      }
    );

    const message = response.data.choices[0].message.content;
    const usage = response.data.usage;
    
    log(`✅ Respuesta del chat recibida`, 'green');
    log(`   Respuesta: "${message}"`, 'blue');
    log(`   Tokens usados: ${usage.total_tokens} (prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens})`, 'blue');
    log(`   Modelo usado: ${response.data.model}`, 'blue');
    
    return true;

  } catch (error) {
    log('❌ Error en el chat', 'red');
    
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else if (error.request) {
      log('   No se recibió respuesta del servidor', 'red');
      log(`   Endpoint: ${AZURE_FOUNDRY_ENDPOINT}/chat/completions`, 'yellow');
    } else {
      log(`   ${error.message}`, 'red');
    }
    
    return false;
  }
}

async function testIntentClassification() {
  logSection('🎯 Probando Clasificación de Intención');

  try {
    log('Clasificando intención de consulta...', 'blue');
    
    const systemPrompt = 'Eres un asistente experto en clasificación de intenciones.';
    const userQuery = 'buscar personas mayores de 30 años';
    
    const response = await axios.post(
      `${AZURE_FOUNDRY_ENDPOINT}/chat/completions`,
      {
        model: AZURE_CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Clasifica la siguiente consulta en una de estas categorías:
            - SEARCH_VECTOR: búsqueda general
            - FILTER_VECTOR: búsqueda con filtros
            - COUNT_VECTOR: contar registros
            
            Consulta: "${userQuery}"
            
            Responde solo con: CATEGORIA|0.95` 
          },
        ],
        temperature: 0.7,
        max_tokens: 50,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_API_KEY,
        },
        timeout: 30000,
      }
    );

    const result = response.data.choices[0].message.content.trim();
    const [intent, confidence] = result.split('|');
    
    log(`✅ Intención clasificada`, 'green');
    log(`   Consulta: "${userQuery}"`, 'blue');
    log(`   Intención: ${intent}`, 'blue');
    log(`   Confianza: ${confidence}`, 'blue');
    
    return true;

  } catch (error) {
    log('❌ Error clasificando intención', 'red');
    log(`   ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('🚀 Iniciando pruebas de Azure AI Foundry', 'bright');
  log('   Este script verifica la conexión y funcionalidad básica\n', 'blue');

  const results = {
    config: false,
    embedding: false,
    chat: false,
    intent: false
  };

  // Test 1: Configuración
  results.config = await testConfiguration();
  if (!results.config) {
    log('\n⚠️ Corrige la configuración antes de continuar', 'yellow');
    process.exit(1);
  }

  // Test 2: Embeddings
  results.embedding = await testEmbedding();

  // Test 3: Chat
  results.chat = await testChat();

  // Test 4: Clasificación de intención (caso de uso real)
  results.intent = await testIntentClassification();

  // Resumen
  logSection('📊 Resumen de Pruebas');
  
  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;
  
  console.log(`\nPruebas exitosas: ${passed}/${total}\n`);
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${test.toUpperCase()}`, color);
  });

  console.log('\n' + '='.repeat(60));
  
  if (passed === total) {
    log('🎉 ¡Todas las pruebas pasaron! Azure AI Foundry está listo.', 'green');
    process.exit(0);
  } else {
    log('⚠️ Algunas pruebas fallaron. Revisa los errores arriba.', 'yellow');
    process.exit(1);
  }
}

// Ejecutar pruebas
runTests().catch(error => {
  log(`\n❌ Error crítico: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
