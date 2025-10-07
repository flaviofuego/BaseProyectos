const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Docker Controller para gestionar contenedores
 */
class DockerController {
  constructor() {
    this.consulta_service_container = process.env.CONSULTA_SERVICE_CONTAINER || 'consulta_service_dev';
  }

  /**
   * Ejecutar comando Docker
   */
  async execDockerCommand(command) {
    try {
      const { stdout, stderr } = await execPromise(command);
      return { success: true, stdout, stderr };
    } catch (error) {
      console.error(`Docker command failed: ${command}`, error);
      return { success: false, error: error.message, stderr: error.stderr };
    }
  }

  /**
   * Verificar si el contenedor está corriendo
   */
  async isContainerRunning() {
    try {
      const result = await this.execDockerCommand(
        `docker ps --filter "name=${this.consulta_service_container}" --filter "status=running" --format "{{.Names}}"`
      );
      return result.success && result.stdout.trim() === this.consulta_service_container;
    } catch (error) {
      console.error('Error checking container status:', error);
      return false;
    }
  }

  /**
   * Obtener estado del contenedor
   */
  async getContainerStatus() {
    try {
      const result = await this.execDockerCommand(
        `docker ps -a --filter "name=${this.consulta_service_container}" --format "{{.Status}}"`
      );
      
      if (result.success && result.stdout.trim()) {
        const status = result.stdout.trim();
        if (status.startsWith('Up')) {
          return 'running';
        } else if (status.startsWith('Exited') || status.startsWith('Created')) {
          return 'stopped';
        }
      }
      return 'not_found';
    } catch (error) {
      console.error('Error getting container status:', error);
      return 'error';
    }
  }

  /**
   * Iniciar contenedor de consulta-service
   */
  async startConsultaService() {
    try {
      console.log(`🚀 Starting ${this.consulta_service_container}...`);
      
      const status = await this.getContainerStatus();
      
      if (status === 'running') {
        console.log(`✅ Container ${this.consulta_service_container} is already running`);
        return { success: true, message: 'Container already running', already_running: true };
      }

      if (status === 'not_found') {
        console.log(`❌ Container ${this.consulta_service_container} not found`);
        return { 
          success: false, 
          message: 'Container not found. Please start docker-compose first.',
          error: 'container_not_found'
        };
      }

      // Iniciar el contenedor
      const result = await this.execDockerCommand(`docker start ${this.consulta_service_container}`);
      
      if (result.success) {
        console.log(`✅ Successfully started ${this.consulta_service_container}`);
        
        // Esperar 2 segundos para que el servicio se registre
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return { 
          success: true, 
          message: 'Container started successfully',
          container: this.consulta_service_container
        };
      } else {
        console.error(`❌ Failed to start ${this.consulta_service_container}:`, result.error);
        return { 
          success: false, 
          message: 'Failed to start container',
          error: result.error
        };
      }
    } catch (error) {
      console.error('Error starting consulta service:', error);
      return { 
        success: false, 
        message: 'Error starting container',
        error: error.message
      };
    }
  }

  /**
   * Detener contenedor de consulta-service
   */
  async stopConsultaService() {
    try {
      console.log(`🛑 Stopping ${this.consulta_service_container}...`);
      
      const status = await this.getContainerStatus();
      
      if (status === 'stopped') {
        console.log(`✅ Container ${this.consulta_service_container} is already stopped`);
        return { success: true, message: 'Container already stopped', already_stopped: true };
      }

      if (status === 'not_found') {
        console.log(`❌ Container ${this.consulta_service_container} not found`);
        return { 
          success: false, 
          message: 'Container not found',
          error: 'container_not_found'
        };
      }

      // Detener el contenedor
      const result = await this.execDockerCommand(`docker stop ${this.consulta_service_container}`);
      
      if (result.success) {
        console.log(`✅ Successfully stopped ${this.consulta_service_container}`);
        return { 
          success: true, 
          message: 'Container stopped successfully',
          container: this.consulta_service_container
        };
      } else {
        console.error(`❌ Failed to stop ${this.consulta_service_container}:`, result.error);
        return { 
          success: false, 
          message: 'Failed to stop container',
          error: result.error
        };
      }
    } catch (error) {
      console.error('Error stopping consulta service:', error);
      return { 
        success: false, 
        message: 'Error stopping container',
        error: error.message
      };
    }
  }

  /**
   * Obtener información completa del contenedor
   */
  async getContainerInfo() {
    try {
      const status = await this.getContainerStatus();
      const isRunning = await this.isContainerRunning();

      return {
        container_name: this.consulta_service_container,
        status: status,
        is_running: isRunning,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting container info:', error);
      return {
        container_name: this.consulta_service_container,
        status: 'error',
        is_running: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new DockerController();
