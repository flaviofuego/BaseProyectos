const BaseAIAdapter = require('./base-ai-adapter');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Adaptador para Google Gemini
 */
class GeminiAdapter extends BaseAIAdapter {
  constructor(config) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error('Se requiere apiKey para GeminiAdapter');
    }

    this.genAI = new GoogleGenerativeAI(config.apiKey);
    
    // Configurar modelos
    this.textModel = this.genAI.getGenerativeModel({ 
      model: config.textModel || 'gemini-2.5-pro',
      generationConfig: {
        temperature: config.temperature || 0.7,
        topK: config.topK || 40,
        topP: config.topP || 0.95,
        maxOutputTokens: config.maxOutputTokens || 2048,
      }
    });

    this.embeddingModel = this.genAI.getGenerativeModel({ 
      model: config.embeddingModel || 'embedding-001'
    });

    this.embeddingDimension = 768; // Dimensión fija de Gemini embeddings
  }

  /**
   * Generar embedding usando Gemini
   */
  async generateEmbedding(text) {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('❌ Error generando embedding con Gemini:', error);
      throw new Error(`Gemini embedding error: ${error.message}`);
    }
  }

  /**
   * Generar texto usando Gemini
   */
  async generateText(prompt, options = {}) {
    try {
      // Aplicar opciones si se proporcionan
      const model = options.temperature || options.maxOutputTokens
        ? this.genAI.getGenerativeModel({ 
            model: this.config.textModel || 'gemini-2.5-pro',
            generationConfig: {
              temperature: options.temperature || this.config.temperature || 0.7,
              topK: options.topK || this.config.topK || 40,
              topP: options.topP || this.config.topP || 0.95,
              maxOutputTokens: options.maxOutputTokens || this.config.maxOutputTokens || 2048,
            }
          })
        : this.textModel;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('❌ Error generando texto con Gemini:', error);
      throw new Error(`Gemini text generation error: ${error.message}`);
    }
  }

  /**
   * Obtener dimensión del embedding
   */
  getEmbeddingDimension() {
    return this.embeddingDimension;
  }

  /**
   * Obtener nombre del proveedor
   */
  getProviderName() {
    return 'Google Gemini';
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await this.textModel.generateContent('Test');
      return result.response.text().length > 0;
    } catch (error) {
      console.error('❌ Gemini health check falló:', error);
      return false;
    }
  }

  /**
   * Obtener información del modelo
   */
  getModelInfo() {
    return {
      provider: 'Google Gemini',
      textModel: this.config.textModel || 'gemini-2.5-pro',
      embeddingModel: this.config.embeddingModel || 'embedding-001',
      embeddingDimension: this.embeddingDimension,
      temperature: this.config.temperature || 0.7,
      maxOutputTokens: this.config.maxOutputTokens || 2048
    };
  }
}

module.exports = GeminiAdapter;
