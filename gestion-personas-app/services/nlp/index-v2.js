/**
 * Servicio NLP mejorado para sistema RAG con Gemini
 * Arquitectura modular, robusta y escalable
 */

const express = require('express');
const { Pool } = require('pg');
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios');
const { createServiceRegistryClient } = require('./shared/service-registry-client');

// Componentes modulares
const EmbeddingsManager = require('./engines/embeddings-manager');
const QueryProcessor = require('./engines/query-processor');
const SQLQueryEngine = require('./engines/sql-query-engine');

require('dotenv').config();

class NLPService {
  constructor() {
    this.app = express();
    this.PORT = process.env.PORT || 3004;
    
    this.initializeDatabase();
    this.initializeComponents();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Inicializa conexión a la base de datos
   */
  initializeDatabase() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    this.pool.on('error', (err) => {
      console.error('❌ Error inesperado en el pool de base de datos:', err);
    });
  }

  /**
   * Inicializa componentes modulares
   */
  initializeComponents() {
    // Gestor de embeddings
    this.embeddingsManager = new EmbeddingsManager({
      apiKey: process.env.GEMINI_API_KEY,
      qdrantUrl: process.env.QDRANT_URL,
      collectionName: 'personas_embeddings_v2',
      maxRetries: 3,
      retryDelay: 1000
    });

    // Procesador de consultas
    this.queryProcessor = new QueryProcessor({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-1.5-flash",
      maxRetries: 2,
      retryDelay: 1000
    });

    // Motor de consultas SQL
    this.sqlEngine = new SQLQueryEngine(this.pool);

    // Estado del servicio
    this.serviceState = {
      isReady: false,
      geminiAvailable: !!process.env.GEMINI_API_KEY,
      qdrantAvailable: false,
      databaseAvailable: false,
      embeddingsCount: 0,
      lastSyncTime: null
    };
  }

  /**
   * Configura middleware
   */
  setupMiddleware() {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }));
    
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Middleware de logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  /**
   * Configura rutas
   */
  setupRoutes() {
    // Health check avanzado
    this.app.get('/health', async (req, res) => {
      try {
        // Verificar base de datos
        await this.pool.query('SELECT 1');
        this.serviceState.databaseAvailable = true;

        // Verificar Qdrant
        try {
          const stats = await this.embeddingsManager.getCollectionStats();
          this.serviceState.qdrantAvailable = true;
          this.serviceState.embeddingsCount = stats?.pointsCount || 0;
        } catch (error) {
          this.serviceState.qdrantAvailable = false;
        }

        res.json({
          status: 'OK',
          service: 'nlp-service-v2',
          version: '2.0.0',
          timestamp: new Date().toISOString(),
          capabilities: {
            gemini_ai: this.serviceState.geminiAvailable,
            vector_search: this.serviceState.qdrantAvailable,
            database: this.serviceState.databaseAvailable,
            embeddings_count: this.serviceState.embeddingsCount,
            advanced_nlp: true,
            semantic_search: true,
            complex_queries: true
          },
          performance: {
            last_sync: this.serviceState.lastSyncTime,
            ready: this.serviceState.isReady
          }
        });
      } catch (error) {
        res.status(503).json({
          status: 'ERROR',
          service: 'nlp-service-v2',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint principal de consulta NLP
    this.app.post('/query', async (req, res) => {
      const startTime = Date.now();
      
      try {
        const { pregunta, options = {} } = req.body;

        if (!pregunta || typeof pregunta !== 'string' || pregunta.trim().length === 0) {
          return res.status(400).json({
            error: 'La pregunta es requerida y debe ser un texto válido',
            code: 'INVALID_QUERY'
          });
        }

        // Limpiar y validar consulta
        const cleanQuery = pregunta.trim();
        if (cleanQuery.length > 1000) {
          return res.status(400).json({
            error: 'La consulta es demasiado larga (máximo 1000 caracteres)',
            code: 'QUERY_TOO_LONG'
          });
        }

        console.log(`🔍 Procesando consulta: "${cleanQuery}"`);

        // 1. Clasificar la consulta
        const queryIntent = await this.queryProcessor.classifyQuery(cleanQuery);
        console.log(`📊 Intención identificada: ${queryIntent.intent} (confianza: ${queryIntent.confidence})`);

        // 2. Ejecutar consulta
        const queryResult = await this.sqlEngine.executeQuery(
          queryIntent, 
          this.serviceState.qdrantAvailable ? this.embeddingsManager : null
        );

        // 3. Generar respuesta contextual
        const response = await this.queryProcessor.generateResponse(queryIntent, queryResult);

        const processingTime = Date.now() - startTime;

        // 4. Preparar respuesta completa
        const result = {
          pregunta: cleanQuery,
          respuesta: response,
          datos: queryResult.data,
          metadata: {
            intent: queryIntent.intent,
            confidence: queryIntent.confidence,
            complexity: queryIntent.complexity,
            query_type: queryResult.query_type,
            processing_time_ms: processingTime,
            results_count: queryResult.count || (Array.isArray(queryResult.data) ? queryResult.data.length : queryResult.data ? 1 : 0),
            timestamp: new Date().toISOString(),
            semantic_search_used: queryIntent.requires_semantic_search && this.serviceState.qdrantAvailable,
            fallback_used: !this.serviceState.qdrantAvailable && queryIntent.requires_semantic_search
          }
        };

        // Agregar estadísticas si están disponibles
        if (queryResult.stats) {
          result.estadisticas = queryResult.stats;
        }

        // Agregar scores de similitud si es búsqueda vectorial
        if (queryResult.vector_scores) {
          result.metadata.vector_scores = queryResult.vector_scores;
        }

        // Log de transacción exitosa
        await this.logTransaction('NLP_QUERY', cleanQuery, 'SUCCESS', req, result);

        res.json(result);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        
        console.error('❌ Error procesando consulta NLP:', error);

        // Log de error
        await this.logTransaction('NLP_QUERY', req.body.pregunta, 'ERROR', req, null, error.message);

        // Respuesta de error estructurada
        res.status(500).json({
          error: 'Error procesando la consulta',
          message: error.message,
          code: 'PROCESSING_ERROR',
          processing_time_ms: processingTime,
          timestamp: new Date().toISOString(),
          suggestion: 'Intenta reformular tu consulta o contacta al administrador si el problema persiste'
        });
      }
    });

    // Endpoint para actualizar embeddings individuales
    this.app.post('/update-embedding', async (req, res) => {
      try {
        const { persona } = req.body;

        if (!persona || !persona.id) {
          return res.status(400).json({
            error: 'Los datos de la persona son requeridos y deben incluir un ID',
            code: 'INVALID_PERSONA_DATA'
          });
        }

        // Calcular edad si no está presente
        if (!persona.edad && persona.fecha_nacimiento) {
          const birthDate = new Date(persona.fecha_nacimiento);
          const today = new Date();
          persona.edad = today.getFullYear() - birthDate.getFullYear();
        }

        const result = await this.embeddingsManager.updatePersonaEmbedding(persona);

        res.json({
          message: 'Embedding actualizado exitosamente',
          persona_id: persona.id,
          embedding_info: result,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Error actualizando embedding:', error);
        res.status(500).json({
          error: 'Error actualizando embedding',
          message: error.message,
          code: 'EMBEDDING_UPDATE_ERROR'
        });
      }
    });

    // Endpoint para sincronización masiva de embeddings
    this.app.post('/sync-embeddings', async (req, res) => {
      try {
        console.log('🔄 Iniciando sincronización masiva de embeddings...');
        
        const syncResult = await this.embeddingsManager.syncAllEmbeddings(this.pool);
        this.serviceState.lastSyncTime = new Date().toISOString();
        this.serviceState.embeddingsCount = syncResult.synced;

        res.json({
          message: 'Sincronización de embeddings completada',
          result: syncResult,
          timestamp: this.serviceState.lastSyncTime
        });

      } catch (error) {
        console.error('❌ Error en sincronización masiva:', error);
        res.status(500).json({
          error: 'Error sincronizando embeddings',
          message: error.message,
          code: 'SYNC_ERROR'
        });
      }
    });

    // Endpoint para eliminar embedding
    this.app.delete('/embedding/:personaId', async (req, res) => {
      try {
        const { personaId } = req.params;
        
        if (!personaId || isNaN(parseInt(personaId))) {
          return res.status(400).json({
            error: 'ID de persona inválido',
            code: 'INVALID_PERSONA_ID'
          });
        }

        await this.embeddingsManager.deletePersonaEmbedding(parseInt(personaId));

        res.json({
          message: 'Embedding eliminado exitosamente',
          persona_id: personaId,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Error eliminando embedding:', error);
        res.status(500).json({
          error: 'Error eliminando embedding',
          message: error.message,
          code: 'EMBEDDING_DELETE_ERROR'
        });
      }
    });

    // Endpoint de estadísticas del servicio
    this.app.get('/stats', async (req, res) => {
      try {
        const collectionStats = await this.embeddingsManager.getCollectionStats();
        
        const dbStats = await this.pool.query(`
          SELECT 
            COUNT(*) as total_personas,
            COUNT(CASE WHEN fecha_nacimiento IS NOT NULL THEN 1 END) as con_edad,
            COUNT(CASE WHEN correo_electronico IS NOT NULL THEN 1 END) as con_email,
            MAX(created_at) as ultima_persona_creada
          FROM personas
        `);

        res.json({
          service: {
            version: '2.0.0',
            uptime_seconds: Math.floor(process.uptime()),
            last_sync: this.serviceState.lastSyncTime,
            ready: this.serviceState.isReady
          },
          database: {
            total_personas: parseInt(dbStats.rows[0].total_personas),
            personas_con_edad: parseInt(dbStats.rows[0].con_edad),
            personas_con_email: parseInt(dbStats.rows[0].con_email),
            ultima_persona_creada: dbStats.rows[0].ultima_persona_creada
          },
          embeddings: collectionStats,
          capabilities: {
            gemini_available: this.serviceState.geminiAvailable,
            qdrant_available: this.serviceState.qdrantAvailable,
            semantic_search: this.serviceState.qdrantAvailable && this.serviceState.geminiAvailable,
            advanced_nlp: this.serviceState.geminiAvailable
          }
        });

      } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
          error: 'Error obteniendo estadísticas del servicio',
          message: error.message
        });
      }
    });

    // Endpoint para pruebas de conectividad
    this.app.post('/test', async (req, res) => {
      const { test_type = 'basic' } = req.body;
      const results = {};

      try {
        // Test de base de datos
        if (test_type === 'all' || test_type === 'database') {
          const dbResult = await this.pool.query('SELECT COUNT(*) FROM personas');
          results.database = {
            status: 'OK',
            total_personas: parseInt(dbResult.rows[0].count)
          };
        }

        // Test de Gemini
        if (test_type === 'all' || test_type === 'gemini') {
          try {
            const testIntent = await this.queryProcessor.classifyQuery('cuántas personas hay');
            results.gemini = {
              status: 'OK',
              test_classification: testIntent.intent
            };
          } catch (error) {
            results.gemini = {
              status: 'ERROR',
              error: error.message
            };
          }
        }

        // Test de Qdrant
        if (test_type === 'all' || test_type === 'qdrant') {
          try {
            const stats = await this.embeddingsManager.getCollectionStats();
            results.qdrant = {
              status: 'OK',
              embeddings_count: stats?.pointsCount || 0
            };
          } catch (error) {
            results.qdrant = {
              status: 'ERROR',
              error: error.message
            };
          }
        }

        res.json({
          message: 'Pruebas completadas',
          test_type,
          results,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        res.status(500).json({
          error: 'Error ejecutando pruebas',
          message: error.message,
          results
        });
      }
    });
  }

  /**
   * Configura manejo de errores
   */
  setupErrorHandling() {
    // Manejo de errores 404
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint no encontrado',
        path: req.originalUrl,
        method: req.method,
        available_endpoints: [
          'POST /query',
          'POST /update-embedding',
          'POST /sync-embeddings',
          'DELETE /embedding/:personaId',
          'GET /health',
          'GET /stats',
          'POST /test'
        ]
      });
    });

    // Manejo de errores globales
    this.app.use((error, req, res, next) => {
      console.error('❌ Error no manejado:', error);
      
      res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Contacta al administrador',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      });
    });

    // Manejo de promesas rechazadas
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promesa rechazada no manejada:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Excepción no capturada:', error);
      process.exit(1);
    });
  }

  /**
   * Inicializa el servicio
   */
  async initialize() {
    try {
      console.log('🚀 Inicializando servicio NLP v2.0...');

      // Inicializar colección de vectores
      await this.embeddingsManager.initializeCollection();
      console.log('✅ Colección de vectores inicializada');

      // Marcar servicio como listo
      this.serviceState.isReady = true;
      console.log('✅ Servicio NLP listo para recibir consultas');

    } catch (error) {
      console.error('❌ Error inicializando servicio:', error);
      this.serviceState.isReady = false;
    }
  }

  /**
   * Registra transacciones en el servicio de logs
   */
  async logTransaction(type, query, status, req, responseData = null, error = null) {
    try {
      const logServiceUrl = process.env.LOG_SERVICE_URL || 'http://log-service:3005';
      await axios.post(`${logServiceUrl}/log`, {
        transaction_type: type,
        entity_type: 'NLP_QUERY_V2',
        user_id: req.headers['x-user-id'] || 'anonymous',
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
   * Inicia el servidor
   */
  async start() {
    try {
      await this.initialize();
      
      this.server = this.app.listen(this.PORT, () => {
        console.log(`🎯 Servicio NLP v2.0 ejecutándose en puerto ${this.PORT}`);
        console.log(`📊 Estado: ${this.serviceState.isReady ? 'LISTO' : 'INICIALIZANDO'}`);
        console.log(`🤖 Gemini AI: ${this.serviceState.geminiAvailable ? 'DISPONIBLE' : 'NO DISPONIBLE'}`);
        console.log(`🔍 Búsqueda vectorial: ${this.serviceState.qdrantAvailable ? 'DISPONIBLE' : 'NO DISPONIBLE'}`);
      });

      // Registrar en Service Registry
      this.registerService();

      return this.server;
    } catch (error) {
      console.error('❌ Error iniciando servidor:', error);
      throw error;
    }
  }

  /**
   * Registra el servicio en el Service Registry
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
          'statistical-queries'
        ]
      }
    };

    createServiceRegistryClient(serviceConfig);
  }

  /**
   * Detiene el servicio gracefully
   */
  async stop() {
    console.log('🛑 Deteniendo servicio NLP...');
    
    if (this.server) {
      this.server.close(() => {
        console.log('✅ Servidor HTTP cerrado');
      });
    }

    if (this.pool) {
      await this.pool.end();
      console.log('✅ Pool de base de datos cerrado');
    }

    console.log('✅ Servicio NLP detenido correctamente');
  }
}

// Crear e iniciar el servicio si se ejecuta directamente
if (require.main === module) {
  const nlpService = new NLPService();
  nlpService.start().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

  // Manejo de señales para shutdown graceful
  process.on('SIGTERM', async () => {
    console.log('📨 Señal SIGTERM recibida, cerrando servicio...');
    await nlpService.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📨 Señal SIGINT recibida, cerrando servicio...');
    await nlpService.stop();
    process.exit(0);
  });
}

module.exports = NLPService;