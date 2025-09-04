const axios = require('axios');

async function testQuery(pregunta) {
  try {
    const response = await axios.post('http://localhost:3004/query', {
      pregunta: pregunta
    });
    console.log('✅ Pregunta:', pregunta);
    console.log('💬 Respuesta:', response.data.respuesta);
    console.log('📊 Intent:', response.data.metadata.intent.intent);
    console.log('---');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Ejecutando pruebas del sistema NLP...\n');
  
  await testQuery('cuántas personas hay registradas');
  await testQuery('personas que empiecen con F');
  await testQuery('quien es la persona más joven');
  await testQuery('dame estadísticas del sistema');
  await testQuery('busca personas jóvenes');
  
  console.log('✅ Todas las pruebas completadas!');
}

runTests();
