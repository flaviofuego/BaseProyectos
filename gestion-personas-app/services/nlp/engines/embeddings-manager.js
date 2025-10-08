/**
 * Gestor de embeddings para el sistema RAG
 * Maneja la generación, almacenamiento y búsqueda de embeddings vectoriales
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { QdrantClient } = require('@qdrant/js-client-rest');

class EmbeddingsManager {
  constructor(config = {}) {
    this.genAI = new GoogleGenerativeAI(config.apiKey || process.env.GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ 
      model: config.embeddingModel || "text-embedding-004" 
    });
    
    this.qdrantClient = new QdrantClient({
      url: config.qdrantUrl || process.env.QDRANT_URL || 'http://qdrant:6333'
    });
    
    this.collectionName = config.collectionName || 'personas_embeddings';
    this.embeddingDimension = config.embeddingDimension || 768;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Inicializa la colección de vectores en Qdrant
   */
  async initializeCollection() {
    try {
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!exists) {
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: this.embeddingDimension,
            distance: 'Cosine'
          },
          optimizers_config: {
            default_segment_number: 2
          },
          hnsw_config: {
            m: 16,
            ef_construct: 100
          }
        });
        console.log(`✅ Colección '${this.collectionName}' creada exitosamente`);
      } else {
        console.log(`✅ Colección '${this.collectionName}' ya existe`);
      }
      return true;
    } catch (error) {
      console.error('❌ Error inicializando colección de vectores:', error);
      throw error;
    }
  }

  /**
   * Genera embedding para un texto con reintentos automáticos
   */
  async generateEmbedding(text, retryCount = 0) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Texto inválido para generar embedding');
      }

      const result = await this.embeddingModel.embedContent(text.trim());
      return result.embedding.values;
    } catch (error) {
      if (retryCount < this.maxRetries && error.message.includes('429')) {
        console.log(`⚠️ Límite de cuota alcanzado, reintentando en ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.generateEmbedding(text, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Crea una representación textual enriquecida de una persona
   */
  createPersonaText(persona) {
    const parts = [];
    
    // Información básica
    if (persona.primer_nombre) {
      parts.push(`Nombre: ${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos || ''}`.trim());
    }
    
    // Documento de identidad
    if (persona.tipo_documento && persona.numero_documento) {
      parts.push(`Documento: ${persona.tipo_documento} ${persona.numero_documento}`);
    }
    
    // Información demográfica
    if (persona.fecha_nacimiento) {
      parts.push(`Fecha de nacimiento: ${persona.fecha_nacimiento}`);
    }
    
    if (persona.edad) {
      parts.push(`Edad: ${persona.edad} años`);
    }
    
    if (persona.genero) {
      parts.push(`Género: ${persona.genero}`);
    }
    
    // Información de contacto
    if (persona.correo_electronico) {
      parts.push(`Email: ${persona.correo_electronico}`);
    }
    
    if (persona.celular) {
      parts.push(`Celular: ${persona.celular}`);
    }

    // Agregar contexto semántico adicional para mejorar búsquedas
    const contextualInfo = [];
    
    if (persona.edad) {
      if (persona.edad < 18) contextualInfo.push('menor de edad, joven');
      else if (persona.edad < 30) contextualInfo.push('joven adulto');
      else if (persona.edad < 50) contextualInfo.push('adulto');
      else if (persona.edad < 65) contextualInfo.push('adulto mayor');
      else contextualInfo.push('tercera edad, senior');
    }
    
    if (persona.genero) {
      contextualInfo.push(`persona de género ${persona.genero.toLowerCase()}`);
    }
    
    if (contextualInfo.length > 0) {
      parts.push(`Características: ${contextualInfo.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Actualiza o crea embedding para una persona
   */
  async updatePersonaEmbedding(persona) {
    try {
      if (!persona || !persona.id) {
        throw new Error('Persona inválida para actualizar embedding');
      }

      const personaText = this.createPersonaText(persona);
      const embedding = await this.generateEmbedding(personaText);

      // Preparar payload con información indexable
      const payload = {
        numero_documento: persona.numero_documento || null,
        nombre_completo: `${persona.primer_nombre || ''} ${persona.segundo_nombre || ''} ${persona.apellidos || ''}`.trim(),
        primer_nombre: persona.primer_nombre || null,
        apellidos: persona.apellidos || null,
        edad: persona.edad || null,
        genero: persona.genero || null,
        tipo_documento: persona.tipo_documento || null,
        correo_electronico: persona.correo_electronico || null,
        celular: persona.celular || null,
        texto_completo: personaText,
        timestamp: new Date().toISOString()
      };

      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: [{
          id: persona.id,
          vector: embedding,
          payload: payload
        }]
      });

      return {
        success: true,
        personaId: persona.id,
        embeddingDimension: embedding.length
      };
    } catch (error) {
      console.error(`❌ Error actualizando embedding para persona ${persona.id}:`, error);
      throw error;
    }
  }

  /**
   * Busca personas similares usando búsqueda vectorial semántica
   */
  async searchSimilarPersonas(query, options = {}) {
    try {
      const {
        limit = 10,
        scoreThreshold = 0.3,
        filters = null,
        withPayload = true
      } = options;

      const queryEmbedding = await this.generateEmbedding(query);
      
      const searchParams = {
        vector: queryEmbedding,
        limit: limit,
        score_threshold: scoreThreshold,
        with_payload: withPayload
      };

      // Agregar filtros si se proporcionan
      if (filters) {
        searchParams.filter = this.buildQdrantFilter(filters);
      }

      const searchResult = await this.qdrantClient.search(this.collectionName, searchParams);
      
      return searchResult.map(result => ({
        id: result.id,
        score: result.score,
        payload: result.payload
      }));
    } catch (error) {
      console.error('❌ Error en búsqueda vectorial:', error);
      return []; // Retornar array vacío como fallback
    }
  }

  /**
   * Construye filtro para Qdrant basado en criterios
   */
  buildQdrantFilter(filters) {
    const conditions = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push({
          key: key,
          match: { value: value }
        });
      }
    });

    return conditions.length > 0 ? { must: conditions } : null;
  }

  /**
   * Sincroniza todos los embeddings desde la base de datos
   */
  async syncAllEmbeddings(pool) {
    try {
      console.log('🔄 Iniciando sincronización masiva de embeddings...');
      
      const result = await pool.query(`
        SELECT p.*, EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
        FROM personas p
        ORDER BY p.id
      `);

      const personas = result.rows;
      console.log(`📊 Encontradas ${personas.length} personas para sincronizar`);
      
      let syncedCount = 0;
      let errorCount = 0;
      const batchSize = 10;

      for (let i = 0; i < personas.length; i += batchSize) {
        const batch = personas.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (persona) => {
          try {
            await this.updatePersonaEmbedding(persona);
            syncedCount++;
          } catch (error) {
            console.error(`❌ Error sincronizando persona ${persona.id}:`, error.message);
            errorCount++;
          }
        }));

        // Pausa entre lotes para no sobrecargar la API
        if (i + batchSize < personas.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`📈 Progreso: ${Math.min(i + batchSize, personas.length)}/${personas.length}`);
      }

      console.log(`✅ Sincronización completada: ${syncedCount} éxitos, ${errorCount} errores`);
      
      return {
        total: personas.length,
        synced: syncedCount,
        errors: errorCount
      };
    } catch (error) {
      console.error('❌ Error en sincronización masiva:', error);
      throw error;
    }
  }

  /**
   * Elimina embedding de una persona
   */
  async deletePersonaEmbedding(personaId) {
    try {
      await this.qdrantClient.delete(this.collectionName, {
        wait: true,
        points: [personaId]
      });
      return { success: true, personaId };
    } catch (error) {
      console.error(`❌ Error eliminando embedding para persona ${personaId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de la colección
   */
  async getCollectionStats() {
    try {
      const info = await this.qdrantClient.getCollection(this.collectionName);
      return {
        pointsCount: info.points_count,
        vectorsConfig: info.config.params.vectors,
        status: info.status
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }
}

module.exports = EmbeddingsManager;