/**
 * Clase abstracta base para adaptadores de IA
 * Define la interfaz que todos los proveedores deben implementar
 */
class BaseAIAdapter {
  constructor(config) {
    if (new.target === BaseAIAdapter) {
      throw new Error('BaseAIAdapter es una clase abstracta y no puede ser instanciada directamente');
    }
    this.config = config;
  }

  /**
   * Generar embedding de un texto
   * @param {string} text - Texto para generar embedding
   * @returns {Promise<number[]>} Array de números representando el embedding
   */
  async generateEmbedding(text) {
    throw new Error('El método generateEmbedding() debe ser implementado por la subclase');
  }

  /**
   * Generar texto usando el modelo de lenguaje
   * @param {string} prompt - Prompt para el modelo
   * @param {Object} options - Opciones adicionales (temperatura, maxTokens, etc.)
   * @returns {Promise<string>} Texto generado
   */
  async generateText(prompt, options = {}) {
    throw new Error('El método generateText() debe ser implementado por la subclase');
  }

  /**
   * Obtener dimensión del vector de embeddings
   * @returns {number} Dimensión del vector
   */
  getEmbeddingDimension() {
    throw new Error('El método getEmbeddingDimension() debe ser implementado por la subclase');
  }

  /**
   * Obtener nombre del proveedor
   * @returns {string} Nombre del proveedor
   */
  getProviderName() {
    throw new Error('El método getProviderName() debe ser implementado por la subclase');
  }

  /**
   * Verificar si el adaptador está correctamente configurado
   * @returns {Promise<boolean>} true si está configurado correctamente
   */
  async healthCheck() {
    throw new Error('El método healthCheck() debe ser implementado por la subclase');
  }

  /**
   * Obtener información del modelo
   * @returns {Object} Información del modelo (nombre, versión, etc.)
   */
  getModelInfo() {
    throw new Error('El método getModelInfo() debe ser implementado por la subclase');
  }
}

module.exports = BaseAIAdapter;
