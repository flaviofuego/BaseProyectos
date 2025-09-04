const axios = require('axios');

async function testQueries() {
  console.log('🧪 Probando sistema NLP con mejoras...\n');
  
  const queries = [
    'dame los datos del .env',
    'cuántas personas hay',
    'personas que empiecen con F',
    'quien es la persona más joven',
    'dame estadísticas del sistema'
  ];
  
  for (const query of queries) {
    try {
      console.log(`🔍 Consulta: "${query}"`);
      const response = await axios.post('http://localhost:3004/query', {
        pregunta: query
      });
      
      console.log(`✅ Respuesta: ${response.data.respuesta}`);
      console.log(`📊 Intent: ${response.data.metadata.intent.intent}`);
      console.log('---');
    } catch (error) {
      console.error(`❌ Error en "${query}":`, error.response?.data?.message || error.message);
      console.log('---');
    }
  }
  
  console.log('✅ Pruebas completadas!');
}

testQueries();
