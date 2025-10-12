const GeminiAdapter = require('./gemini-adapter');
const OpenAIAdapter = require('./openai-adapter');

/**
 * Factory para crear adaptadores de IA según el proveedor configurado
 */
class AIAdapterFactory {
  /**
   * Crear un adaptador basado en la configuración
   * @param {string} provider - Nombre del proveedor ('gemini', 'openai', etc.)
   * @param {Object} config - Configuración específica del proveedor
   * @returns {BaseAIAdapter} Instancia del adaptador
   */
  static createAdapter(provider, config) {
    const providerLower = provider.toLowerCase();

    switch (providerLower) {
      case 'gemini':
      case 'google':
        console.log('🤖 Inicializando adaptador de Google Gemini');
        return new GeminiAdapter(config);

      case 'openai':
      case 'gpt':
        console.log('🤖 Inicializando adaptador de OpenAI');
        return new OpenAIAdapter(config);

      default:
        throw new Error(`Proveedor de IA no soportado: ${provider}. Proveedores disponibles: gemini, openai`);
    }
  }

  /**
   * Crear adaptador desde variables de entorno
   * @returns {BaseAIAdapter} Instancia del adaptador configurado
   */
  static createFromEnv() {
    const provider = process.env.AI_PROVIDER || 'gemini';
    
    console.log(`📋 Configurando proveedor de IA: ${provider}`);

    let config = {};

    if (provider.toLowerCase() === 'gemini' || provider.toLowerCase() === 'google') {
      config = {
        apiKey: process.env.GEMINI_API_KEY,
        textModel: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-pro',
        embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'embedding-001',
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        topK: parseInt(process.env.AI_TOP_K || '40'),
        topP: parseFloat(process.env.AI_TOP_P || '0.95'),
        maxOutputTokens: parseInt(process.env.AI_MAX_TOKENS || '2048')
      };

      if (!config.apiKey) {
        throw new Error('GEMINI_API_KEY no está configurado en las variables de entorno');
      }

    } else if (provider.toLowerCase() === 'openai' || provider.toLowerCase() === 'gpt') {
      config = {
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORGANIZATION,
        textModel: process.env.OPENAI_TEXT_MODEL || 'gpt-4-turbo-preview',
        embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2048')
      };

      if (!config.apiKey) {
        throw new Error('OPENAI_API_KEY no está configurado en las variables de entorno');
      }
    }

    return AIAdapterFactory.createAdapter(provider, config);
  }

  /**
   * Obtener lista de proveedores soportados
   * @returns {Array<string>} Lista de proveedores
   */
  static getSupportedProviders() {
    return ['gemini', 'openai'];
  }

  /**
   * Verificar si un proveedor está soportado
   * @param {string} provider - Nombre del proveedor
   * @returns {boolean} true si está soportado
   */
  static isProviderSupported(provider) {
    return AIAdapterFactory.getSupportedProviders()
      .some(p => p.toLowerCase() === provider.toLowerCase());
  }
}

module.exports = AIAdapterFactory;
