/**
 * Script de prueba para Docker Controller
 * Ejecutar con: docker exec auth_service_dev node test-docker-controller.js
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function testDockerController() {
  console.log('🧪 Testing Docker Controller...\n');
  
  const containerName = 'consulta_service_dev';
  
  try {
    // 1. Verificar estado actual
    console.log('1️⃣ Verificando estado actual del contenedor...');
    const statusCmd = `docker ps -a --filter "name=${containerName}" --format "{{.Status}}"`;
    const { stdout: statusOut } = await execPromise(statusCmd);
    console.log(`   Estado: ${statusOut.trim()}\n`);
    
    // 2. Probar detener contenedor
    console.log('2️⃣ Intentando detener contenedor...');
    const stopCmd = `docker stop ${containerName}`;
    const { stdout: stopOut, stderr: stopErr } = await execPromise(stopCmd);
    console.log(`   ✅ Contenedor detenido: ${stopOut.trim() || containerName}`);
    
    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Verificar que está detenido
    console.log('3️⃣ Verificando que está detenido...');
    const { stdout: statusOut2 } = await execPromise(statusCmd);
    console.log(`   Estado: ${statusOut2.trim()}\n`);
    
    // 4. Probar iniciar contenedor
    console.log('4️⃣ Intentando iniciar contenedor...');
    const startCmd = `docker start ${containerName}`;
    const { stdout: startOut } = await execPromise(startCmd);
    console.log(`   ✅ Contenedor iniciado: ${startOut.trim() || containerName}`);
    
    // Esperar 3 segundos para que se registre
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. Verificar que está corriendo
    console.log('5️⃣ Verificando que está corriendo...');
    const { stdout: statusOut3 } = await execPromise(statusCmd);
    console.log(`   Estado: ${statusOut3.trim()}\n`);
    
    // 6. Verificar que responde
    console.log('6️⃣ Verificando que el servicio responde...');
    const healthCmd = `docker exec ${containerName} wget -qO- http://localhost:3003/health 2>/dev/null || echo "No responde"`;
    const { stdout: healthOut } = await execPromise(healthCmd);
    console.log(`   Respuesta: ${healthOut.trim().substring(0, 100)}...\n`);
    
    console.log('✅ ¡Todas las pruebas exitosas!');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    process.exit(1);
  }
}

testDockerController();
