require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { QdrantClient } = require('@qdrant/js-client-rest');
const axios = require('axios');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { createServiceRegistryClient } = require('./shared/service-registry-client');
const { AIAdapterFactory } = require('./adapters');

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

    // Inicializar adaptador de IA (Gemini, OpenAI, etc.)
    try {
      this.aiAdapter = AIAdapterFactory.createFromEnv();
      console.log(`✅ Adaptador de IA inicializado: ${this.aiAdapter.getProviderName()}`);
      console.log(`📊 Modelo de texto: ${this.aiAdapter.getModelInfo().textModel}`);
      console.log(`📊 Modelo de embeddings: ${this.aiAdapter.getModelInfo().embeddingModel}`);
    } catch (error) {
      console.error('❌ Error inicializando adaptador de IA:', error);
      throw error;
    }

    // Configuración de Qdrant (Vector Database)
    this.qdrantClient = new QdrantClient({ 
      url: process.env.QDRANT_URL || 'http://qdrant:6333'
    });
    this.COLLECTION_NAME = 'personas_embeddings';
    this.VECTOR_SIZE = this.aiAdapter.getEmbeddingDimension(); // Dimensión dinámica según el proveedor

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
      console.log('🚀 Iniciando NLP Service v2.0 (Vector-Only Mode)...');
      
      // Verificar conexión a PostgreSQL
      await this.pool.query('SELECT NOW()');
      console.log('✅ Conexión a PostgreSQL establecida');

      // Inicializar colección de Qdrant
      await this.initializeQdrantCollection();
      console.log('✅ Colección de Qdrant inicializada');

      // Verificar si ya hay embeddings
      await this.updateServiceStats();
      
      if (this.serviceState.totalEmbeddings === 0) {
        console.log('⚠️  No se encontraron embeddings. Sincronización necesaria.');
        console.log('� Ejecuta POST /sync-embeddings para sincronizar manualmente');
      } else {
        console.log(`✅ Base de datos vectorial ya contiene ${this.serviceState.totalEmbeddings} embeddings`);
        
        // Sincronizar solo si hay diferencias
        const dbResult = await this.pool.query('SELECT COUNT(*) as total FROM personas');
        const totalPersonas = parseInt(dbResult.rows[0].total);
        
        if (totalPersonas !== this.serviceState.totalEmbeddings) {
          console.log(`⚠️  Desincronización detectada: ${totalPersonas} personas vs ${this.serviceState.totalEmbeddings} embeddings`);
          console.log('🔄 Intentando sincronización automática...');
          
          try {
            await this.syncEmbeddingsFromPostgres();
            console.log('✅ Sincronización automática completada');
          } catch (syncError) {
            console.error('⚠️  Sincronización automática falló (posible límite de cuota)');
            console.error('💡 El servicio funcionará con los embeddings existentes');
            console.error('💡 Ejecuta POST /sync-embeddings más tarde para sincronizar');
          }
        }
      }

      this.serviceState.ready = true;
      console.log('✅ NLP Service completamente inicializado');

      // Registrar en Service Registry
      this.registerService();
      
    } catch (error) {
      console.error('❌ Error inicializando servicio:', error);
      // Marcar como ready de todos modos si tenemos embeddings
      if (this.serviceState.totalEmbeddings > 0) {
        this.serviceState.ready = true;
        console.log('⚠️  Servicio iniciado en modo degradado (con embeddings existentes)');
      } else {
        this.serviceState.ready = false;
      }
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
   * 🤖 Generar embedding usando el adaptador de IA configurado
   */
  async generateEmbedding(text) {
    try {
      return await this.aiAdapter.generateEmbedding(text);
    } catch (error) {
      console.error('❌ Error generando embedding:', error);
      throw error;
    }
  }

  /**
   * � Sincronizar embeddings desde PostgreSQL
   */
  async syncEmbeddingsFromPostgres() {
    try {
      console.log('🔄 Obteniendo personas desde PostgreSQL...');

      // Obtener todas las personas
      const result = await this.pool.query('SELECT * FROM personas_con_edad ORDER BY id');
      const personas = result.rows;

      console.log(`📊 Total de personas a sincronizar: ${personas.length}`);

      if (personas.length === 0) {
        console.log('ℹ️ No hay personas para sincronizar');
        this.serviceState.lastSync = new Date().toISOString();
        return { success: true, synced: 0 };
      }

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
                primer_nombre: persona.primer_nombre,
                segundo_nombre: persona.segundo_nombre || '',
                apellidos: persona.apellidos,
                genero: persona.genero,
                edad: persona.edad,
                fecha_nacimiento: persona.fecha_nacimiento,
                grupo_edad: persona.grupo_edad,
                correo_electronico: persona.correo_electronico,
                celular: persona.celular,
                created_at: persona.created_at,
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

        console.log(`✅ Lote ${Math.floor(i / batchSize) + 1} procesado (${successCount}/${personas.length})`);
      }

      this.serviceState.lastSync = new Date().toISOString();

      console.log(`✅ Sincronización completada: ${successCount} éxitos, ${errorCount} errores`);

      return {
        success: true,
        synced: successCount,
        errors: errorCount,
        total: personas.length
      };

    } catch (error) {
      console.error('❌ Error sincronizando embeddings:', error);
      throw error;
    }
  }

  /**
   * �🔍 Clasificar intención de consulta usando Gemini
   */
  async classifyIntent(query) {
    const prompt = `Analiza la siguiente consulta en lenguaje natural y clasifica su intención.

Consulta: "${query}"

Clasifica en una de estas categorías:
1. SEARCH - Búsqueda general de personas (ej: "buscar personas", "mostrar todos", "listar personas")
2. FILTER - Filtrado específico (ej: "personas mayores de 30", "hombres de Bogotá")
3. COUNT - Contar registros (ej: "cuántas personas hay", "número de mujeres")
4. AGGREGATE - Estadísticas o agregaciones (ej: "edad promedio", "personas por ciudad")
5. SPECIFIC - Búsqueda de persona específica (ej: "buscar Juan Pérez", "documento 123456")
6. DEMOGRAPHIC - Análisis demográfico (ej: "distribución por género", "rango de edades")

Responde SOLO con el nombre de la categoría (una palabra en mayúsculas) seguido de un nivel de confianza (0-1).
Formato: CATEGORIA|0.95

No agregues explicaciones adicionales.`;

    try {
      const response = await this.aiAdapter.generateText(prompt);
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
   * 🔎 Extraer filtros desde lenguaje natural usando Gemini
   */
  async extractFilters(query, intent) {
    const prompt = `Analiza la siguiente consulta y extrae los filtros específicos que se deben aplicar.

Consulta: "${query}"
Intención: ${intent}

Campos disponibles en la base de datos:
- nombre_completo (texto)
- primer_nombre (texto)
- segundo_nombre (texto)
- apellidos (texto)
- numero_documento (texto)
- tipo_documento (valores: 'Tarjeta de identidad', 'Cédula')
- genero (valores: 'Masculino', 'Femenino', 'No binario', 'Prefiero no reportar')
- edad (número)
- grupo_edad (valores: 'Menor de edad', 'Adulto', 'Adulto mayor')
- correo_electronico (texto)
- celular (texto)
- fecha_nacimiento (fecha)

Extrae los filtros en formato JSON. Ejemplos:

Consulta: "personas mayores de 30 años"
Respuesta: {"edad_min": 30}

Consulta: "mujeres de Bogotá"
Respuesta: {"genero": "Femenino"}

Consulta: "buscar Juan Pérez"
Respuesta: {"nombre_parcial": "Juan Pérez"}

Consulta: "documento 123456"
Respuesta: {"numero_documento": "123456"}

Consulta: "adultos mayores"
Respuesta: {"grupo_edad": "Adulto mayor"}

Responde SOLO con el objeto JSON, sin explicaciones, sin markdown.`;

    try {
      let response = await this.aiAdapter.generateText(prompt);
      
      // Limpiar markdown si existe
      response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const filters = JSON.parse(response);
      return filters;
    } catch (error) {
      console.error('❌ Error extrayendo filtros:', error);
      return {};
    }
  }

  /**
   * 🔍 Búsqueda semántica en Qdrant con filtros
   */
  async semanticSearch(query, filters = {}, limit = 100) {
    try {
      // Generar embedding de la consulta
      const queryEmbedding = await this.generateEmbedding(query);

      // Construir filtros de Qdrant
      const qdrantFilter = this.buildQdrantFilter(filters);

      // Configurar búsqueda
      const searchConfig = {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true
      };

      // Agregar filtro si existe
      if (qdrantFilter) {
        searchConfig.filter = qdrantFilter;
      }

      // Buscar en Qdrant
      const searchResult = await this.qdrantClient.search(this.COLLECTION_NAME, searchConfig);

      return searchResult;
    } catch (error) {
      console.error('❌ Error en búsqueda semántica:', error);
      return [];
    }
  }

  /**
   * 🔧 Construir filtro de Qdrant desde filtros extraídos
   */
  buildQdrantFilter(filters) {
    const conditions = [];

    // Filtro por género
    if (filters.genero) {
      conditions.push({
        key: 'genero',
        match: { value: filters.genero }
      });
    }

    // Filtro por tipo de documento
    if (filters.tipo_documento) {
      conditions.push({
        key: 'tipo_documento',
        match: { value: filters.tipo_documento }
      });
    }

    // Filtro por número de documento
    if (filters.numero_documento) {
      conditions.push({
        key: 'numero_documento',
        match: { value: filters.numero_documento }
      });
    }

    // Filtro por grupo de edad
    if (filters.grupo_edad) {
      conditions.push({
        key: 'grupo_edad',
        match: { value: filters.grupo_edad }
      });
    }

    // Filtro por edad mínima
    if (filters.edad_min !== undefined) {
      conditions.push({
        key: 'edad',
        range: { gte: filters.edad_min }
      });
    }

    // Filtro por edad máxima
    if (filters.edad_max !== undefined) {
      conditions.push({
        key: 'edad',
        range: { lte: filters.edad_max }
      });
    }

    // Si no hay condiciones, retornar null
    if (conditions.length === 0) {
      return null;
    }

    // Si hay una sola condición, retornarla directamente
    if (conditions.length === 1) {
      return conditions[0];
    }

    // Si hay múltiples condiciones, usar AND
    return {
      must: conditions
    };
  }

  /**
   * 📊 Procesar agregaciones y estadísticas desde resultados vectoriales
   */
  async processAggregations(results, intent, query) {
    try {
      // Extraer payloads
      const personas = results.map(r => r.payload);

      let aggregationResult = {};

      if (intent === 'COUNT') {
        aggregationResult = {
          total: personas.length,
          description: `Se encontraron ${personas.length} personas`
        };
      } else if (intent === 'AGGREGATE') {
        // Calcular estadísticas
        const edades = personas.map(p => p.edad).filter(e => e !== null && e !== undefined);
        
        aggregationResult = {
          total: personas.length,
          edad_promedio: edades.length > 0 ? (edades.reduce((a, b) => a + b, 0) / edades.length).toFixed(1) : 0,
          edad_minima: edades.length > 0 ? Math.min(...edades) : 0,
          edad_maxima: edades.length > 0 ? Math.max(...edades) : 0
        };
      } else if (intent === 'DEMOGRAPHIC') {
        // Análisis demográfico
        const porGenero = {};
        const porGrupoEdad = {};

        personas.forEach(p => {
          porGenero[p.genero] = (porGenero[p.genero] || 0) + 1;
          porGrupoEdad[p.grupo_edad] = (porGrupoEdad[p.grupo_edad] || 0) + 1;
        });

        aggregationResult = {
          total: personas.length,
          por_genero: porGenero,
          por_grupo_edad: porGrupoEdad
        };
      }

      return aggregationResult;
    } catch (error) {
      console.error('❌ Error procesando agregaciones:', error);
      return { total: results.length };
    }
  }

  /**
   * 📄 Generar respuesta en Markdown desde resultados vectoriales
   */
  async generateMarkdownResponse(query, vectorResults, intent, aggregationData = null) {
    // Convertir resultados vectoriales a formato simple
    const results = vectorResults.map(r => ({
      score: r.score,
      ...r.payload
    }));

    const resultsInfo = JSON.stringify(results.slice(0, 5), null, 2); // Primeros 5 resultados como muestra

    const prompt = `Eres un asistente que presenta resultados de búsquedas vectoriales de manera clara y profesional en formato Markdown.

Consulta del usuario: "${query}"
Intención: ${intent}
Método de búsqueda: Búsqueda vectorial semántica (Qdrant + Gemini embeddings)
Total de resultados: ${results.length}

${aggregationData ? `Estadísticas agregadas:
${JSON.stringify(aggregationData, null, 2)}` : ''}

Muestra de datos (primeros 5 registros con score de similitud):
${resultsInfo}

Genera una respuesta en formato Markdown que incluya:

1. **Resumen breve** (2-3 líneas) respondiendo la consulta
2. **Tabla formateada** con los datos más relevantes (usa sintaxis de tabla Markdown)
3. **Insights adicionales** basados en los datos o estadísticas agregadas

Reglas importantes:
- Usa tablas Markdown (| Columna | Columna |)
- Usa negritas (**texto**) para destacar información clave
- Usa listas cuando sea apropiado
- Sé conciso y profesional
- Si hay muchos resultados, menciona que se muestran los primeros N
- Formatea fechas en formato legible (DD/MM/YYYY)
- Para edades, agrega contexto (ej: "23 años")
- Traduce nombres de columnas al español de forma natural
- El campo "score" indica la relevancia (0-1), puedes mencionarlo si es relevante
- NO incluyas campos técnicos como "persona_id", "updated_at" en la tabla final

NO uses bloques de código (no uses \`\`\`).
Responde SOLO en Markdown puro.`;

    try {
      const response = await this.aiAdapter.generateText(prompt);
      return response;
    } catch (error) {
      console.error('❌ Error generando respuesta Markdown:', error);
      
      // Fallback: generar respuesta básica
      if (results.length === 0) {
        return '## Sin resultados\n\nNo se encontraron registros que coincidan con tu consulta.';
      }

      let markdown = `## Resultados (${results.length} registros encontrados)\n\n`;
      
      // Si hay agregaciones, mostrarlas
      if (aggregationData) {
        markdown += '### Estadísticas\n\n';
        Object.entries(aggregationData).forEach(([key, value]) => {
          if (typeof value === 'object') {
            markdown += `**${key}:**\n`;
            Object.entries(value).forEach(([k, v]) => {
              markdown += `- ${k}: ${v}\n`;
            });
          } else {
            markdown += `- **${key}:** ${value}\n`;
          }
        });
        markdown += '\n';
      }

      // Generar tabla básica con campos relevantes
      markdown += '| Nombre | Documento | Género | Edad | Correo |\n';
      markdown += '| --- | --- | --- | --- | --- |\n';
      
      results.slice(0, 20).forEach(row => {
        markdown += `| ${row.nombre_completo || 'N/A'} | ${row.numero_documento || 'N/A'} | ${row.genero || 'N/A'} | ${row.edad || 'N/A'} | ${row.correo_electronico || 'N/A'} |\n`;
      });

      if (results.length > 20) {
        markdown += `\n*Se muestran los primeros 20 de ${results.length} resultados.*`;
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
          mode: 'vector-only',
          ai_provider: this.aiAdapter.getProviderName(),
          ai_model_info: this.aiAdapter.getModelInfo(),
          uptime: Math.floor((Date.now() - this.serviceState.startTime) / 1000),
          timestamp: new Date().toISOString(),
          dependencies: {
            postgresql: false,
            qdrant: false,
            ai_provider: false
          },
          capabilities: {
            natural_language_processing: true,
            vector_search_only: true,
            semantic_search: true,
            embeddings_generation: true,
            markdown_responses: true,
            intent_classification: true,
            filter_extraction: true,
            aggregations: true
          },
          stats: {
            total_embeddings: this.serviceState.totalEmbeddings,
            last_sync: this.serviceState.lastSync,
            auto_sync_on_start: true
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

        // Verificar proveedor de IA
        try {
          health.dependencies.ai_provider = await this.aiAdapter.healthCheck();
        } catch (error) {
          console.error('AI Provider health check failed:', error);
          health.dependencies.ai_provider = false;
        }

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
    // POST /query - Consulta NLP Principal usando Vector DB ⭐
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

        console.log(`🔍 Procesando consulta vectorial: "${query}"`);

        // 2. Clasificar intención
        const { intent, confidence } = await this.classifyIntent(query);
        console.log(`🎯 Intención: ${intent} (confianza: ${confidence})`);

        // 3. Extraer filtros de la consulta
        console.log('🔧 Extrayendo filtros...');
        const filters = await this.extractFilters(query, intent);
        console.log(`📋 Filtros extraídos:`, filters);

        // 4. Realizar búsqueda semántica con filtros
        console.log('🔎 Ejecutando búsqueda vectorial en Qdrant...');
        const vectorResults = await this.semanticSearch(query, filters, 100);
        console.log(`✅ Resultados vectoriales obtenidos: ${vectorResults.length}`);

        // 5. Procesar agregaciones si es necesario
        let aggregationData = null;
        if (intent === 'COUNT' || intent === 'AGGREGATE' || intent === 'DEMOGRAPHIC') {
          console.log('� Procesando agregaciones...');
          aggregationData = await this.processAggregations(vectorResults, intent, query);
        }

        // 6. Generar respuesta en Markdown
        console.log('📄 Generando respuesta en Markdown...');
        const markdownResponse = await this.generateMarkdownResponse(
          query,
          vectorResults,
          intent,
          aggregationData
        );

        const processingTime = Date.now() - startTime;

        // 7. Preparar respuesta
        const response = {
          success: true,
          data: {
            markdown: markdownResponse,
            raw_results: vectorResults.map(r => ({
              score: r.score,
              ...r.payload
            })),
            aggregations: aggregationData
          },
          metadata: {
            intent: intent,
            confidence: confidence,
            results_count: vectorResults.length,
            processing_time_ms: processingTime,
            search_method: 'vector_search',
            filters_applied: Object.keys(filters).length > 0 ? filters : null
          }
        };

        // 8. Registrar en logs
        await this.logTransaction('NLP_QUERY_VECTOR', query, 'SUCCESS', req, response);

        res.json(response);

      } catch (error) {
        console.error('❌ Error procesando consulta:', error);
        
        const processingTime = Date.now() - startTime;
        
        await this.logTransaction('NLP_QUERY_VECTOR', query, 'ERROR', req, null, error.message);

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

        // Obtener datos de la persona desde PostgreSQL
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

        // Almacenar en Qdrant con todos los campos
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
                primer_nombre: persona.primer_nombre,
                segundo_nombre: persona.segundo_nombre || '',
                apellidos: persona.apellidos,
                genero: persona.genero,
                edad: persona.edad,
                fecha_nacimiento: persona.fecha_nacimiento,
                grupo_edad: persona.grupo_edad,
                correo_electronico: persona.correo_electronico,
                celular: persona.celular,
                created_at: persona.created_at,
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
          message: 'Embedding actualizado correctamente en la base de datos vectorial',
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
    // POST /sync-embeddings - Sincronización Masiva Manual
    // ============================================================
    this.app.post('/sync-embeddings', async (req, res) => {
      try {
        console.log('🔄 Iniciando sincronización manual de embeddings...');

        const result = await this.syncEmbeddingsFromPostgres();

        res.json({
          success: result.success,
          message: 'Sincronización completada',
          stats: {
            total: result.total,
            success: result.synced,
            errors: result.errors,
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
            vector_database: {
              total_embeddings: collectionInfo.points_count,
              vector_size: collectionInfo.config.params.vectors.size,
              distance_metric: collectionInfo.config.params.vectors.distance,
              sync_status: collectionInfo.points_count === parseInt(dbStats.rows[0].total_personas) ? 'synced' : 'out-of-sync'
            },
            ai_provider: {
              name: this.aiAdapter.getProviderName(),
              model_info: this.aiAdapter.getModelInfo()
            },
            service: {
              version: '2.0.0',
              mode: 'vector-only',
              uptime_seconds: Math.floor((Date.now() - this.serviceState.startTime) / 1000),
              last_sync: this.serviceState.lastSync,
              ready: this.serviceState.ready,
              capabilities: [
                'natural-language-query',
                'vector-search-only',
                'semantic-search',
                'embeddings-generation',
                'markdown-responses',
                'intent-classification',
                'filter-extraction',
                'aggregations',
                'multi-provider-ai'
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
        mode: 'vector-only',
        description: 'Advanced Natural Language Processing service using ONLY Qdrant vector database with Google Gemini embeddings. No SQL queries - pure vector search with semantic understanding.',
        maintainer: 'nlp-team',
        healthEndpoint: '/health',
        tags: ['nlp', 'ai', 'gemini', 'vector-only', 'embeddings', 'qdrant', 'semantic-search', 'rag'],
        capabilities: [
          'natural-language-query',
          'vector-search-only',
          'embeddings-generation',
          'semantic-search',
          'gemini-ai',
          'intent-classification',
          'filter-extraction',
          'demographic-analysis',
          'aggregations',
          'markdown-responses',
          'auto-sync-on-start'
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
      console.log('🧠 NLP Service v2.0 - Vector Database Only');
      console.log(`✅ Servidor escuchando en puerto ${this.PORT}`);
      console.log(`🔗 URL: http://localhost:${this.PORT}`);
      console.log(`📊 Health Check: http://localhost:${this.PORT}/health`);
      console.log(`📈 Estadísticas: http://localhost:${this.PORT}/stats`);
      console.log(`🔄 Sincronización automática al inicio: ACTIVADA`);
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
