require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { QdrantClient } = require('@qdrant/js-client-rest');
const axios = require('axios');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { createServiceRegistryClient } = require('./shared/service-registry-client');

class NLPService {
  constructor() {
    this.app = express();
    this.PORT = process.env.SERVICE_PORT || 3004;
    
    // Configuración de base de datos PostgreSQL
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Configuración de Google Gemini AI
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.geminiModel = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    // Modelo para embeddings (más eficiente)
    this.embeddingModel = this.genAI.getGenerativeModel({ 
      model: 'embedding-001'
    });

    // Configuración de Qdrant (Vector Database)
    this.qdrantClient = new QdrantClient({ 
      url: process.env.QDRANT_URL || 'http://qdrant:6333'
    });
    this.COLLECTION_NAME = 'personas_embeddings';
    this.VECTOR_SIZE = 768; // Dimensión de embeddings de Gemini

    // Estado del servicio
    this.serviceState = {
      ready: false,
      lastSync: null,
      totalEmbeddings: 0,
      startTime: Date.now()
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeService();
  }

  /**
   * 🔧 Configuración de middleware
   */
  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging de requests
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      next();
    });
  }

  /**
   * 🚀 Inicialización del servicio
   */
  async initializeService() {
    try {
      console.log('🚀 Iniciando NLP Service v2.0...');
      
      // Verificar conexión a PostgreSQL
      await this.pool.query('SELECT NOW()');
      console.log('✅ Conexión a PostgreSQL establecida');

      // Inicializar colección de Qdrant
      await this.initializeQdrantCollection();
      console.log('✅ Colección de Qdrant inicializada');

      // Obtener estadísticas iniciales
      await this.updateServiceStats();

      this.serviceState.ready = true;
      console.log('✅ NLP Service completamente inicializado');

      // Registrar en Service Registry
      this.registerService();
      
    } catch (error) {
      console.error('❌ Error inicializando servicio:', error);
      this.serviceState.ready = false;
    }
  }

  /**
   * 🗄️ Inicializar colección de Qdrant
   */
  async initializeQdrantCollection() {
    try {
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some(c => c.name === this.COLLECTION_NAME);

      if (!exists) {
        await this.qdrantClient.createCollection(this.COLLECTION_NAME, {
          vectors: {
            size: this.VECTOR_SIZE,
            distance: 'Cosine'
          }
        });
        console.log(`✅ Colección '${this.COLLECTION_NAME}' creada`);
      } else {
        console.log(`ℹ️ Colección '${this.COLLECTION_NAME}' ya existe`);
      }
    } catch (error) {
      console.error('❌ Error inicializando Qdrant:', error);
      throw error;
    }
  }

  /**
   * 📊 Actualizar estadísticas del servicio
   */
  async updateServiceStats() {
    try {
      const collectionInfo = await this.qdrantClient.getCollection(this.COLLECTION_NAME);
      this.serviceState.totalEmbeddings = collectionInfo.points_count || 0;
    } catch (error) {
      console.error('⚠️ Error actualizando estadísticas:', error);
    }
  }

  /**
   * 📝 Registrar transacciones en el servicio de logs
   */
  async logTransaction(type, query, status, req, responseData = null, error = null) {
    try {
      const logServiceUrl = process.env.LOG_SERVICE_URL || 'http://log-service:3005';
      await axios.post(`${logServiceUrl}/log`, {
        transaction_type: type,
        entity_type: 'NLP_QUERY_V2',
        user_id: req.headers['x-user-id'],
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        request_data: { query, timestamp: new Date().toISOString() },
        response_data: responseData ? {
          intent: responseData.metadata?.intent,
          results_count: responseData.metadata?.results_count,
          processing_time: responseData.metadata?.processing_time_ms
        } : null,
        status: status,
        error_message: error
      }, {
        timeout: 5000
      });
    } catch (logError) {
      console.error('⚠️ Error registrando transacción:', logError.message);
    }
  }

  /**
   * 🤖 Generar embedding usando Gemini
   */
  async generateEmbedding(text) {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('❌ Error generando embedding:', error);
      throw error;
    }
  }

  /**
   * 🔍 Clasificar intención de consulta usando Gemini
   */
  async classifyIntent(query) {
    const prompt = `Analiza la siguiente consulta en lenguaje natural y clasifica su intención.

Consulta: "${query}"

Clasifica en una de estas categorías:
1. SEARCH - Búsqueda general de personas (ej: "buscar personas", "mostrar todos")
2. FILTER - Filtrado específico (ej: "personas mayores de 30", "hombres de Bogotá")
3. COUNT - Contar registros (ej: "cuántas personas hay", "número de mujeres")
4. AGGREGATE - Estadísticas o agregaciones (ej: "edad promedio", "personas por ciudad")
5. SPECIFIC - Búsqueda de persona específica (ej: "buscar Juan Pérez", "documento 123456")
6. DEMOGRAPHIC - Análisis demográfico (ej: "distribución por género", "rango de edades")
7. COMPLEX - Consulta compleja que requiere SQL avanzado

Responde SOLO con el nombre de la categoría (una palabra en mayúsculas) seguido de un nivel de confianza (0-1).
Formato: CATEGORIA|0.95

No agregues explicaciones adicionales.`;

    try {
      const result = await this.geminiModel.generateContent(prompt);
      const response = result.response.text().trim();
      const [intent, confidence] = response.split('|');
      
      return {
        intent: intent.trim(),
        confidence: parseFloat(confidence) || 0.8
      };
    } catch (error) {
      console.error('❌ Error clasificando intención:', error);
      return { intent: 'SEARCH', confidence: 0.5 };
    }
  }

  /**
   * 🔎 Generar SQL dinámico desde lenguaje natural
   */
  async generateSQL(query, intent) {
    const schemaInfo = `
Esquema de base de datos en PostgreSQL:
- Tabla: personas
  Columnas:
  * id (INTEGER, PRIMARY KEY)
  * numero_documento (VARCHAR(10), UNIQUE)
  * tipo_documento (VARCHAR(30), VALUES: 'Tarjeta de identidad', 'Cédula')
  * primer_nombre (VARCHAR(30))
  * segundo_nombre (VARCHAR(30), NULLABLE)
  * apellidos (VARCHAR(60))
  * fecha_nacimiento (DATE)
  * genero (VARCHAR(20), VALUES: 'Masculino', 'Femenino', 'No binario', 'Prefiero no reportar')
  * correo_electronico (VARCHAR(255))
  * celular (VARCHAR(10))
  * created_at (TIMESTAMP)

- Vista: personas_con_edad
  Incluye todas las columnas de 'personas' más:
  * edad (INTEGER, calculada)
  * grupo_edad (VARCHAR, VALUES: 'Menor de edad', 'Adulto', 'Adulto mayor')

Reglas importantes:
1. Usa personas_con_edad cuando necesites filtrar o mostrar edad
2. SIEMPRE incluye LIMIT para evitar resultados masivos (máximo 100)
3. Usa ORDER BY para resultados ordenados
4. Para fechas, usa formato 'YYYY-MM-DD'
5. Para nombres, usa ILIKE para búsqueda case-insensitive
6. Los géneros son exactamente: 'Masculino', 'Femenino', 'No binario', 'Prefiero no reportar'
`;

    const prompt = `${schemaInfo}

Consulta del usuario: "${query}"
Intención detectada: ${intent}

Genera UNA ÚNICA consulta SQL válida para PostgreSQL que responda a esta consulta.

Requisitos:
- SQL válido y seguro (sin inyección)
- Incluye LIMIT apropiado (máximo 100)
- Usa alias descriptivos para columnas calculadas
- Para conteos usa COUNT(*)
- Para promedios usa ROUND(AVG(...), 1)
- Para agrupaciones usa GROUP BY con nombres claros

Responde SOLO con el SQL, sin explicaciones, sin markdown, sin prefijos.`;

    try {
      const result = await this.geminiModel.generateContent(prompt);
      let sql = result.response.text().trim();
      
      // Limpiar el SQL (remover markdown si existe)
      sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Validación básica de seguridad
      const dangerousKeywords = /drop|delete|truncate|alter|create|insert|update/gi;
      if (dangerousKeywords.test(sql)) {
        throw new Error('Consulta SQL potencialmente peligrosa detectada');
      }

      return sql;
    } catch (error) {
      console.error('❌ Error generando SQL:', error);
      throw error;
    }
  }

  /**
   * 🔍 Búsqueda semántica en Qdrant
   */
  async semanticSearch(query, limit = 10) {
    try {
      // Generar embedding de la consulta
      const queryEmbedding = await this.generateEmbedding(query);

      // Buscar en Qdrant
      const searchResult = await this.qdrantClient.search(this.COLLECTION_NAME, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true
      });

      return searchResult;
    } catch (error) {
      console.error('❌ Error en búsqueda semántica:', error);
      return [];
    }
  }

  /**
   * 📄 Generar respuesta en Markdown desde resultados
   */
  async generateMarkdownResponse(query, sqlResults, intent, useSemanticSearch = false) {
    const resultsInfo = JSON.stringify(sqlResults.slice(0, 5), null, 2); // Primeros 5 resultados como muestra

    const prompt = `Eres un asistente que presenta resultados de bases de datos de manera clara y profesional en formato Markdown.

Consulta del usuario: "${query}"
Intención: ${intent}
Búsqueda semántica usada: ${useSemanticSearch ? 'Sí' : 'No'}
Total de resultados: ${sqlResults.length}

Muestra de datos (primeros 5 registros):
${resultsInfo}

Genera una respuesta en formato Markdown que incluya:

1. **Resumen breve** (2-3 líneas) respondiendo la consulta
2. **Tabla formateada** con los datos relevantes (usa sintaxis de tabla Markdown)
3. **Insights adicionales** si hay patrones interesantes

Reglas importantes:
- Usa tablas Markdown (| Columna | Columna |)
- Usa negritas (**texto**) para destacar
- Usa listas cuando sea apropiado
- Sé conciso y profesional
- Si hay muchos resultados, menciona que se muestran los primeros N
- Formatea fechas en formato legible (DD/MM/YYYY)
- Para edades, agrega contexto (ej: "23 años")
- Traduce nombres de columnas al español de forma natural

NO uses bloques de código (no uses \`\`\`).
Responde SOLO en Markdown puro.`;

    try {
      const result = await this.geminiModel.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('❌ Error generando respuesta Markdown:', error);
      
      // Fallback: generar tabla básica
      if (sqlResults.length === 0) {
        return '## Sin resultados\n\nNo se encontraron registros que coincidan con tu consulta.';
      }

      let markdown = `## Resultados (${sqlResults.length} registros)\n\n`;
      
      // Generar tabla básica
      const columns = Object.keys(sqlResults[0]);
      markdown += '| ' + columns.join(' | ') + ' |\n';
      markdown += '| ' + columns.map(() => '---').join(' | ') + ' |\n';
      
      sqlResults.slice(0, 20).forEach(row => {
        markdown += '| ' + columns.map(col => row[col] || 'N/A').join(' | ') + ' |\n';
      });

      if (sqlResults.length > 20) {
        markdown += `\n*Se muestran los primeros 20 de ${sqlResults.length} resultados.*`;
      }

      return markdown;
    }
  }

  /**
   * 🛣️ Configuración de rutas
   */
  setupRoutes() {
    // ============================================================
    // GET /health - Health Check Avanzado
    // ============================================================
    this.app.get('/health', async (req, res) => {
      try {
        const health = {
          status: this.serviceState.ready ? 'healthy' : 'starting',
          service: 'nlp-service-v2',
          version: '2.0.0',
          uptime: Math.floor((Date.now() - this.serviceState.startTime) / 1000),
          timestamp: new Date().toISOString(),
          dependencies: {
            postgresql: false,
            qdrant: false,
            gemini: false
          },
          capabilities: {
            natural_language_processing: true,
            semantic_search: true,
            embeddings_generation: true,
            markdown_responses: true
          },
          stats: {
            total_embeddings: this.serviceState.totalEmbeddings,
            last_sync: this.serviceState.lastSync
          }
        };

        // Verificar PostgreSQL
        try {
          await this.pool.query('SELECT 1');
          health.dependencies.postgresql = true;
        } catch (error) {
          console.error('PostgreSQL health check failed:', error);
        }

        // Verificar Qdrant
        try {
          await this.qdrantClient.getCollections();
          health.dependencies.qdrant = true;
        } catch (error) {
          console.error('Qdrant health check failed:', error);
        }

        // Verificar Gemini (asumimos true si llegamos aquí)
        health.dependencies.gemini = !!process.env.GEMINI_API_KEY;

        const allHealthy = Object.values(health.dependencies).every(v => v === true);
        health.status = allHealthy && this.serviceState.ready ? 'healthy' : 'degraded';

        res.status(allHealthy ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    });

    // ============================================================
    // POST /query - Consulta NLP Principal ⭐
    // ============================================================
    this.app.post('/query', async (req, res) => {
      const startTime = Date.now();
      const { query } = req.body;

      try {
        // 1. Validación
        if (!query || typeof query !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Se requiere un parámetro "query" válido'
          });
        }

        if (query.length > 1000) {
          return res.status(400).json({
            success: false,
            error: 'La consulta no puede exceder 1000 caracteres'
          });
        }

        console.log(`🔍 Procesando consulta: "${query}"`);

        // 2. Clasificar intención
        const { intent, confidence } = await this.classifyIntent(query);
        console.log(`🎯 Intención: ${intent} (confianza: ${confidence})`);

        let results = [];
        let useSemanticSearch = false;
        let sql = null;

        // 3. Decidir estrategia de búsqueda
        if (intent === 'SPECIFIC' && confidence > 0.7) {
          // Búsqueda semántica para consultas específicas
          console.log('🔎 Usando búsqueda semántica...');
          const semanticResults = await this.semanticSearch(query, 10);
          
          if (semanticResults.length > 0) {
            // Obtener IDs de personas encontradas
            const personaIds = semanticResults.map(r => r.payload.persona_id);
            sql = `SELECT * FROM personas_con_edad WHERE id IN (${personaIds.join(',')}) LIMIT 10`;
            const dbResult = await this.pool.query(sql);
            results = dbResult.rows;
            useSemanticSearch = true;
          }
        }

        // 4. Si no se usó búsqueda semántica o no dio resultados, usar SQL
        if (results.length === 0) {
          console.log('🔧 Generando consulta SQL...');
          sql = await this.generateSQL(query, intent);
          console.log(`📝 SQL generado: ${sql}`);

          const dbResult = await this.pool.query(sql);
          results = dbResult.rows;
        }

        console.log(`✅ Resultados obtenidos: ${results.length}`);

        // 5. Generar respuesta en Markdown
        console.log('📄 Generando respuesta en Markdown...');
        const markdownResponse = await this.generateMarkdownResponse(
          query,
          results,
          intent,
          useSemanticSearch
        );

        const processingTime = Date.now() - startTime;

        // 6. Preparar respuesta
        const response = {
          success: true,
          data: {
            markdown: markdownResponse,
            raw_results: results,
            sql: sql
          },
          metadata: {
            intent: intent,
            confidence: confidence,
            results_count: results.length,
            processing_time_ms: processingTime,
            used_semantic_search: useSemanticSearch,
            complexity: intent === 'COMPLEX' ? 'high' : 'medium'
          }
        };

        // 7. Registrar en logs
        await this.logTransaction('NLP_QUERY', query, 'SUCCESS', req, response);

        res.json(response);

      } catch (error) {
        console.error('❌ Error procesando consulta:', error);
        
        const processingTime = Date.now() - startTime;
        
        await this.logTransaction('NLP_QUERY', query, 'ERROR', req, null, error.message);

        res.status(500).json({
          success: false,
          error: 'Error procesando la consulta',
          details: error.message,
          metadata: {
            processing_time_ms: processingTime
          }
        });
      }
    });

    // ============================================================
    // POST /update-embedding - Actualizar Embedding Individual
    // ============================================================
    this.app.post('/update-embedding', async (req, res) => {
      try {
        const { persona_id } = req.body;

        if (!persona_id) {
          return res.status(400).json({
            success: false,
            error: 'Se requiere persona_id'
          });
        }

        // Obtener datos de la persona
        const result = await this.pool.query(
          'SELECT * FROM personas_con_edad WHERE id = $1',
          [persona_id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Persona no encontrada'
          });
        }

        const persona = result.rows[0];

        // Crear texto para embedding
        const embeddingText = `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos} 
          ${persona.tipo_documento} ${persona.numero_documento} 
          ${persona.genero} edad ${persona.edad} años 
          ${persona.correo_electronico} ${persona.celular}`.trim();

        // Generar embedding
        const embedding = await this.generateEmbedding(embeddingText);

        // Almacenar en Qdrant
        await this.qdrantClient.upsert(this.COLLECTION_NAME, {
          wait: true,
          points: [
            {
              id: persona.id,
              vector: embedding,
              payload: {
                persona_id: persona.id,
                nombre_completo: `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos}`.trim(),
                numero_documento: persona.numero_documento,
                tipo_documento: persona.tipo_documento,
                genero: persona.genero,
                edad: persona.edad,
                correo: persona.correo_electronico,
                updated_at: new Date().toISOString()
              }
            }
          ]
        });

        await this.updateServiceStats();

        console.log(`✅ Embedding actualizado para persona ${persona_id}`);

        await this.logTransaction('UPDATE_EMBEDDING', `persona_id: ${persona_id}`, 'SUCCESS', req);

        res.json({
          success: true,
          message: 'Embedding actualizado correctamente',
          persona_id: persona_id
        });

      } catch (error) {
        console.error('❌ Error actualizando embedding:', error);
        await this.logTransaction('UPDATE_EMBEDDING', req.body, 'ERROR', req, null, error.message);
        
        res.status(500).json({
          success: false,
          error: 'Error actualizando embedding',
          details: error.message
        });
      }
    });

    // ============================================================
    // POST /sync-embeddings - Sincronización Masiva
    // ============================================================
    this.app.post('/sync-embeddings', async (req, res) => {
      try {
        console.log('🔄 Iniciando sincronización masiva de embeddings...');

        // Obtener todas las personas
        const result = await this.pool.query('SELECT * FROM personas_con_edad ORDER BY id');
        const personas = result.rows;

        console.log(`📊 Total de personas a sincronizar: ${personas.length}`);

        let successCount = 0;
        let errorCount = 0;
        const batchSize = 10;

        // Procesar en lotes
        for (let i = 0; i < personas.length; i += batchSize) {
          const batch = personas.slice(i, i + batchSize);
          
          const points = await Promise.all(batch.map(async (persona) => {
            try {
              const embeddingText = `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos} 
                ${persona.tipo_documento} ${persona.numero_documento} 
                ${persona.genero} edad ${persona.edad} años 
                ${persona.correo_electronico} ${persona.celular}`.trim();

              const embedding = await this.generateEmbedding(embeddingText);

              successCount++;
              return {
                id: persona.id,
                vector: embedding,
                payload: {
                  persona_id: persona.id,
                  nombre_completo: `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos}`.trim(),
                  numero_documento: persona.numero_documento,
                  tipo_documento: persona.tipo_documento,
                  genero: persona.genero,
                  edad: persona.edad,
                  correo: persona.correo_electronico,
                  updated_at: new Date().toISOString()
                }
              };
            } catch (error) {
              console.error(`❌ Error procesando persona ${persona.id}:`, error);
              errorCount++;
              return null;
            }
          }));

          // Filtrar nulos y hacer upsert
          const validPoints = points.filter(p => p !== null);
          if (validPoints.length > 0) {
            await this.qdrantClient.upsert(this.COLLECTION_NAME, {
              wait: true,
              points: validPoints
            });
          }

          console.log(`✅ Lote ${Math.floor(i / batchSize) + 1} procesado`);
        }

        this.serviceState.lastSync = new Date().toISOString();
        await this.updateServiceStats();

        console.log(`✅ Sincronización completada: ${successCount} éxitos, ${errorCount} errores`);

        await this.logTransaction('SYNC_EMBEDDINGS', `Total: ${personas.length}`, 'SUCCESS', req, {
          success_count: successCount,
          error_count: errorCount
        });

        res.json({
          success: true,
          message: 'Sincronización completada',
          stats: {
            total: personas.length,
            success: successCount,
            errors: errorCount,
            synced_at: this.serviceState.lastSync
          }
        });

      } catch (error) {
        console.error('❌ Error en sincronización:', error);
        await this.logTransaction('SYNC_EMBEDDINGS', 'bulk', 'ERROR', req, null, error.message);
        
        res.status(500).json({
          success: false,
          error: 'Error en sincronización',
          details: error.message
        });
      }
    });

    // ============================================================
    // DELETE /embedding/:personaId - Eliminar Embedding
    // ============================================================
    this.app.delete('/embedding/:personaId', async (req, res) => {
      try {
        const { personaId } = req.params;

        if (!personaId || isNaN(personaId)) {
          return res.status(400).json({
            success: false,
            error: 'ID de persona inválido'
          });
        }

        await this.qdrantClient.delete(this.COLLECTION_NAME, {
          wait: true,
          points: [parseInt(personaId)]
        });

        await this.updateServiceStats();

        console.log(`🗑️ Embedding eliminado para persona ${personaId}`);

        await this.logTransaction('DELETE_EMBEDDING', `persona_id: ${personaId}`, 'SUCCESS', req);

        res.json({
          success: true,
          message: 'Embedding eliminado correctamente',
          persona_id: personaId
        });

      } catch (error) {
        console.error('❌ Error eliminando embedding:', error);
        await this.logTransaction('DELETE_EMBEDDING', req.params.personaId, 'ERROR', req, null, error.message);
        
        res.status(500).json({
          success: false,
          error: 'Error eliminando embedding',
          details: error.message
        });
      }
    });

    // ============================================================
    // GET /stats - Estadísticas del Servicio
    // ============================================================
    this.app.get('/stats', async (req, res) => {
      try {
        // Estadísticas de base de datos
        const dbStats = await this.pool.query(`
          SELECT 
            COUNT(*) as total_personas,
            COUNT(CASE WHEN fecha_nacimiento IS NOT NULL THEN 1 END) as personas_con_edad,
            COUNT(CASE WHEN correo_electronico IS NOT NULL THEN 1 END) as personas_con_email,
            MAX(created_at) as ultima_persona_creada
          FROM personas
        `);

        // Estadísticas de Qdrant
        const collectionInfo = await this.qdrantClient.getCollection(this.COLLECTION_NAME);

        res.json({
          success: true,
          stats: {
            database: {
              total_personas: parseInt(dbStats.rows[0].total_personas),
              personas_con_edad: parseInt(dbStats.rows[0].personas_con_edad),
              personas_con_email: parseInt(dbStats.rows[0].personas_con_email),
              ultima_persona: dbStats.rows[0].ultima_persona_creada
            },
            embeddings: {
              total_embeddings: collectionInfo.points_count,
              vector_size: collectionInfo.config.params.vectors.size,
              distance_metric: collectionInfo.config.params.vectors.distance
            },
            service: {
              version: '2.0.0',
              uptime_seconds: Math.floor((Date.now() - this.serviceState.startTime) / 1000),
              last_sync: this.serviceState.lastSync,
              ready: this.serviceState.ready,
              capabilities: [
                'natural-language-query',
                'semantic-search',
                'embeddings-generation',
                'markdown-responses',
                'sql-generation'
              ]
            }
          }
        });

      } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
          success: false,
          error: 'Error obteniendo estadísticas',
          details: error.message
        });
      }
    });

    // ============================================================
    // POST /test - Pruebas de Conectividad
    // ============================================================
    this.app.post('/test', async (req, res) => {
      const { test_type = 'basic' } = req.body;
      const results = {
        test_type,
        timestamp: new Date().toISOString(),
        tests: {}
      };

      try {
        // Test de Base de Datos
        if (test_type === 'all' || test_type === 'database') {
          try {
            const start = Date.now();
            await this.pool.query('SELECT COUNT(*) FROM personas');
            results.tests.database = {
              status: 'pass',
              response_time_ms: Date.now() - start
            };
          } catch (error) {
            results.tests.database = {
              status: 'fail',
              error: error.message
            };
          }
        }

        // Test de Gemini
        if (test_type === 'all' || test_type === 'gemini') {
          try {
            const start = Date.now();
            const result = await this.geminiModel.generateContent('Di solo "OK"');
            const response = result.response.text();
            results.tests.gemini = {
              status: 'pass',
              response_time_ms: Date.now() - start,
              response: response.substring(0, 50)
            };
          } catch (error) {
            results.tests.gemini = {
              status: 'fail',
              error: error.message
            };
          }
        }

        // Test de Qdrant
        if (test_type === 'all' || test_type === 'qdrant') {
          try {
            const start = Date.now();
            const collections = await this.qdrantClient.getCollections();
            results.tests.qdrant = {
              status: 'pass',
              response_time_ms: Date.now() - start,
              collections: collections.collections.length
            };
          } catch (error) {
            results.tests.qdrant = {
              status: 'fail',
              error: error.message
            };
          }
        }

        // Test básico
        if (test_type === 'basic') {
          results.tests.basic = {
            status: 'pass',
            message: 'Servicio NLP funcionando correctamente'
          };
        }

        const allPassed = Object.values(results.tests).every(t => t.status === 'pass');

        res.status(allPassed ? 200 : 500).json({
          success: allPassed,
          results
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Error ejecutando pruebas',
          details: error.message
        });
      }
    });

    // Ruta 404
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        available_endpoints: [
          'GET /health',
          'POST /query',
          'POST /update-embedding',
          'POST /sync-embeddings',
          'DELETE /embedding/:personaId',
          'GET /stats',
          'POST /test'
        ]
      });
    });

    // Manejo de errores global
    this.app.use((err, req, res, next) => {
      console.error('❌ Error no manejado:', err);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: err.message
      });
    });
  }

  /**
   * 📝 Registrar servicio en Service Registry
   */
  registerService() {
    const serviceConfig = {
      serviceId: 'nlp-service-v2',
      name: 'nlp-service',
      host: 'nlp-service',
      port: parseInt(this.PORT),
      protocol: 'http',
      metadata: {
        version: '2.0.0',
        description: 'Advanced Natural Language Processing service with RAG capabilities using Google Gemini and Qdrant vector search',
        maintainer: 'nlp-team',
        healthEndpoint: '/health',
        tags: ['nlp', 'ai', 'gemini', 'vector-search', 'embeddings', 'qdrant', 'rag', 'semantic-search'],
        capabilities: [
          'natural-language-query',
          'vector-search',
          'embeddings-generation',
          'semantic-search',
          'gemini-ai',
          'advanced-intent-classification',
          'complex-query-processing',
          'demographic-analysis',
          'statistical-queries',
          'markdown-responses'
        ]
      }
    };

    createServiceRegistryClient(serviceConfig);
  }

  /**
   * 🚀 Iniciar servidor
   */
  start() {
    this.app.listen(this.PORT, () => {
      console.log('='.repeat(60));
      console.log('🧠 NLP Service v2.0 con RAG');
      console.log('='.repeat(60));
      console.log(`✅ Servidor escuchando en puerto ${this.PORT}`);
      console.log(`🔗 URL: http://localhost:${this.PORT}`);
      console.log(`📊 Health Check: http://localhost:${this.PORT}/health`);
      console.log(`📈 Estadísticas: http://localhost:${this.PORT}/stats`);
      console.log('='.repeat(60));
    });
  }
}

// Iniciar servicio
const nlpService = new NLPService();
nlpService.start();

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('\n🔄 Cerrando servicio...');
  await nlpService.pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🔄 Cerrando servicio...');
  await nlpService.pool.end();
  process.exit(0);
});
