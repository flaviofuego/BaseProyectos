// Script para probar los logs con autenticación
const axios = require('axios');

async function testLogs() {
  try {
    console.log('🔍 Testeando sistema de logs...');
    
    // 1. Primero hacer login
    console.log('1. Haciendo login...');
    const loginResponse = await axios.post('http://localhost:8001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso, token obtenido');
    
    // 2. Hacer búsqueda de logs con autenticación
    console.log('2. Buscando logs...');
    const logsResponse = await axios.get('http://localhost:8001/api/logs/search', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Logs obtenidos:');
    console.log('- Total logs:', logsResponse.data.pagination.total);
    console.log('- Logs en página:', logsResponse.data.logs.length);
    console.log('- Página:', logsResponse.data.pagination.page);
    
    // 3. Probar estadísticas
    console.log('3. Obteniendo estadísticas...');
    const statsResponse = await axios.get('http://localhost:8001/api/logs/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Estadísticas obtenidas:');
    console.log('- Total transacciones:', statsResponse.data.total_transactions);
    console.log('- Tasa de error:', statsResponse.data.error_rate + '%');
    
    // 4. Mostrar algunos logs de ejemplo
    if (logsResponse.data.logs.length > 0) {
      console.log('📋 Logs recientes:');
      logsResponse.data.logs.slice(0, 3).forEach((log, i) => {
        console.log(`${i+1}. ${log.created_at} - ${log.transaction_type} - ${log.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testLogs();
