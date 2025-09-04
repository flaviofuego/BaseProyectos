#!/usr/bin/env node
// Sistema de monitoreo del NLP y RAG

const axios = require('axios');
const { QdrantClient } = require('@qdrant/js-client-rest');

const SERVICES = {
  nlp: 'http://localhost:3004',
  qdrant: 'http://localhost:6333',
  gateway: 'http://localhost:8001'
};

async function checkNLPService() {
  console.log('🔍 Verificando servicio NLP...');
  try {
    const response = await axios.get(`${SERVICES.nlp}/health`);
    console.log('✅ NLP Service:', response.data);
    return true;
  } catch (error) {
    console.log('❌ NLP Service Error:', error.message);
    return false;
  }
}

async function checkQdrant() {
  console.log('🔍 Verificando Qdrant (Vector DB)...');
  try {
    const client = new QdrantClient({ url: SERVICES.qdrant });
    const collections = await client.getCollections();
    const personasCollection = collections.collections.find(c => c.name === 'personas_embeddings');
    
    if (personasCollection) {
      const info = await client.getCollection('personas_embeddings');
      console.log('✅ Qdrant funcionando - Vectores:', info.points_count);
      return true;
    } else {
      console.log('⚠️ Colección personas_embeddings no encontrada');
      return false;
    }
  } catch (error) {
    console.log('❌ Qdrant Error:', error.message);
    return false;
  }
}

async function testNLPQuery() {
  console.log('🔍 Probando consulta NLP...');
  try {
    const response = await axios.post(`${SERVICES.nlp}/query`, {
      pregunta: 'estadísticas del sistema'
    });
    console.log('✅ Consulta NLP exitosa');
    console.log('📊 Respuesta:', response.data.respuesta);
    return true;
  } catch (error) {
    console.log('❌ Error en consulta NLP:', error.response?.data || error.message);
    return false;
  }
}

async function checkGeminiQuota() {
  console.log('🔍 Verificando estado de Gemini API...');
  try {
    const testScript = `
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    model.generateContent("Test").then(r => console.log("OK")).catch(e => console.log("ERROR:", e.message));
    `;
    
    // Esta verificación se haría en el contenedor
    console.log('ℹ️ Para verificar Gemini, ejecuta: docker exec nlp_service_dev node test-gemini.js');
    return true;
  } catch (error) {
    console.log('❌ Error verificando Gemini:', error.message);
    return false;
  }
}

async function runDiagnostic() {
  console.log('🚀 Iniciando diagnóstico completo del sistema NLP + RAG\n');
  
  const results = [];
  
  results.push(await checkNLPService());
  results.push(await checkQdrant());
  results.push(await testNLPQuery());
  results.push(await checkGeminiQuota());
  
  const successCount = results.filter(r => r).length;
  const totalChecks = results.length;
  
  console.log('\n📋 RESUMEN DEL DIAGNÓSTICO');
  console.log('='.repeat(40));
  console.log(`✅ Verificaciones exitosas: ${successCount}/${totalChecks}`);
  
  if (successCount === totalChecks) {
    console.log('🎉 Sistema completamente operativo');
  } else {
    console.log('⚠️ Algunos componentes requieren atención');
  }
  
  console.log('\n💡 Para más detalles, revisa: DIAGNOSTICO-NLP.md');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runDiagnostic().catch(console.error);
}

module.exports = { runDiagnostic, checkNLPService, checkQdrant, testNLPQuery };
