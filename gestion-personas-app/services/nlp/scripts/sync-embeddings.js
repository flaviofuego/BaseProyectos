/**
 * Script para sincronizar embeddings de todas las personas
 * 
 * Este script conecta con el servicio NLP y sincroniza todos los embeddings
 * de personas desde PostgreSQL hacia Qdrant.
 * 
 * Uso:
 *   node scripts/sync-embeddings.js [--force]
 */

const axios = require('axios');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:3004';

async function syncEmbeddings() {
  console.log('🔄 Iniciando sincronización de embeddings...');
  console.log(`📍 URL del servicio: ${NLP_SERVICE_URL}`);
  
  try {
    // Verificar estado del servicio
    console.log('\n1️⃣ Verificando salud del servicio...');
    const healthResponse = await axios.get(`${NLP_SERVICE_URL}/health`);
    
    if (healthResponse.data.status !== 'healthy') {
      console.error('❌ El servicio NLP no está completamente saludable');
      console.log('Estado:', JSON.stringify(healthResponse.data, null, 2));
      
      if (!healthResponse.data.dependencies.postgresql) {
        console.error('   ❌ PostgreSQL no está disponible');
      }
      if (!healthResponse.data.dependencies.qdrant) {
        console.error('   ❌ Qdrant no está disponible');
      }
      if (!healthResponse.data.dependencies.gemini) {
        console.error('   ❌ Gemini AI no está configurado');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Servicio NLP saludable');
    console.log(`   Uptime: ${healthResponse.data.uptime}s`);
    console.log(`   Embeddings actuales: ${healthResponse.data.stats.total_embeddings}`);
    
    // Iniciar sincronización
    console.log('\n2️⃣ Iniciando sincronización masiva...');
    const startTime = Date.now();
    
    const syncResponse = await axios.post(`${NLP_SERVICE_URL}/sync-embeddings`, {}, {
      timeout: 600000 // 10 minutos de timeout para grandes datasets
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    if (syncResponse.data.success) {
      console.log('\n✅ Sincronización completada exitosamente');
      console.log(`   Tiempo total: ${duration}s`);
      console.log(`   Total de personas: ${syncResponse.data.stats.total}`);
      console.log(`   Sincronizados exitosamente: ${syncResponse.data.stats.success}`);
      console.log(`   Errores: ${syncResponse.data.stats.errors}`);
      console.log(`   Fecha de sincronización: ${syncResponse.data.stats.synced_at}`);
      
      // Verificar estadísticas finales
      console.log('\n3️⃣ Verificando estadísticas finales...');
      const statsResponse = await axios.get(`${NLP_SERVICE_URL}/stats`);
      
      if (statsResponse.data.success) {
        console.log(`   Total embeddings en Qdrant: ${statsResponse.data.stats.embeddings.total_embeddings}`);
        console.log(`   Total personas en BD: ${statsResponse.data.stats.database.total_personas}`);
      }
      
      process.exit(0);
    } else {
      console.error('❌ Error en la sincronización');
      console.error(syncResponse.data.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error durante la sincronización:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${error.response.data.error || error.response.data}`);
      if (error.response.data.details) {
        console.error(`   Detalles: ${error.response.data.details}`);
      }
    } else if (error.request) {
      console.error('   No se pudo conectar con el servicio NLP');
      console.error(`   Verifica que el servicio esté corriendo en ${NLP_SERVICE_URL}`);
    } else {
      console.error(`   ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Ejecutar script
console.log('╔════════════════════════════════════════════════╗');
console.log('║   Sincronización de Embeddings - NLP Service  ║');
console.log('╚════════════════════════════════════════════════╝');

syncEmbeddings();
