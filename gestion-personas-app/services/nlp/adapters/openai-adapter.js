const BaseAIAdapter = require('./base-ai-adapter');
const OpenAI = require('openai');

/**
 * Adaptador para OpenAI (GPT-4, GPT-3.5, text-embedding-ada-002, etc.)
 */
class OpenAIAdapter extends BaseAIAdapter {
  constructor(config) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error('Se requiere apiKey para OpenAIAdapter');
    }

    this.openai = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization || undefined
    });

    // Configuración de modelos
    this.textModel = config.textModel || 'gpt-4-turbo-preview';
    this.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
    
    // Dimensión de embeddings según el modelo
    this.embeddingDimensions = {
      'text-embedding-ada-002': 1536,
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072
    };
    
    this.embeddingDimension = this.embeddingDimensions[this.embeddingModel] || 1536;
    
    // Configuración de generación
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 2048;
  }

  /**
   * Generar embedding usando OpenAI
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
        encoding_format: 'float'
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Error generando embedding con OpenAI:', error);
      throw new Error(`OpenAI embedding error: ${error.message}`);
    }
  }

  /**
   * Generar texto usando OpenAI
   */
  async generateText(prompt, options = {}) {
    try {
      const response = await this.openai.chat.completions.create({
        model: options.model || this.textModel,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature !== undefined ? options.temperature : this.temperature,
        max_tokens: options.maxTokens || this.maxTokens,
        top_p: options.topP || 1.0,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ Error generando texto con OpenAI:', error);
      throw new Error(`OpenAI text generation error: ${error.message}`);
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
    return 'OpenAI';
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.textModel,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });
      return response.choices.length > 0;
    } catch (error) {
      console.error('❌ OpenAI health check falló:', error);
      return false;
    }
  }

  /**
   * Obtener información del modelo
   */
  getModelInfo() {
    return {
      provider: 'OpenAI',
      textModel: this.textModel,
      embeddingModel: this.embeddingModel,
      embeddingDimension: this.embeddingDimension,
      temperature: this.temperature,
      maxTokens: this.maxTokens
    };
  }
}

module.exports = OpenAIAdapter;
