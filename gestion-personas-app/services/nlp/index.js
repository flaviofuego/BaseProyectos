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

      // Sincronizar embeddings automáticamente al iniciar
      console.log('🔄 Sincronizando embeddings con Qdrant...');
      await this.autoSyncEmbeddings();

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
   * 🔄 Sincronización automática de embeddings al iniciar
   */
  async autoSyncEmbeddings() {
    try {
      console.log('📊 Verificando estado de sincronización...');

      // Obtener total de personas en PostgreSQL
      const dbResult = await this.pool.query('SELECT COUNT(*) as total FROM personas_con_edad');
      const totalPersonasDB = parseInt(dbResult.rows[0].total);

      // Obtener total de embeddings en Qdrant
      const collectionInfo = await this.qdrantClient.getCollection(this.COLLECTION_NAME);
      const totalEmbeddings = collectionInfo.points_count || 0;

      console.log(`📊 PostgreSQL: ${totalPersonasDB} personas | Qdrant: ${totalEmbeddings} embeddings`);

      // Si hay diferencia, sincronizar
      if (totalPersonasDB !== totalEmbeddings) {
        console.log(`🔄 Diferencia detectada. Iniciando sincronización automática...`);
        
        // Obtener todas las personas
        const result = await this.pool.query('SELECT * FROM personas_con_edad ORDER BY id');
        const personas = result.rows;

        let successCount = 0;
        let errorCount = 0;
        const batchSize = 10;

        // Procesar en lotes
        for (let i = 0; i < personas.length; i += batchSize) {
          const batch = personas.slice(i, i + batchSize);
          
          const points = await Promise.all(batch.map(async (persona) => {
            try {
              // Texto enriquecido para embedding
              const embeddingText = `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos} 
                ${persona.tipo_documento} ${persona.numero_documento} 
                ${persona.genero} edad ${persona.edad} años ${persona.grupo_edad || ''}
                ${persona.correo_electronico} ${persona.celular}
                nacimiento ${persona.fecha_nacimiento || ''}`.trim();

              const embedding = await this.generateEmbedding(embeddingText);

              successCount++;
              return {
                id: persona.id,
                vector: embedding,
                payload: {
                  persona_id: persona.id,
                  primer_nombre: persona.primer_nombre,
                  segundo_nombre: persona.segundo_nombre || null,
                  apellidos: persona.apellidos,
                  nombre_completo: `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos}`.trim(),
                  numero_documento: persona.numero_documento,
                  tipo_documento: persona.tipo_documento,
                  genero: persona.genero,
                  edad: persona.edad,
                  grupo_edad: persona.grupo_edad || null,
                  fecha_nacimiento: persona.fecha_nacimiento ? persona.fecha_nacimiento.toISOString().split('T')[0] : null,
                  correo: persona.correo_electronico,
                  correo_electronico: persona.correo_electronico,
                  celular: persona.celular,
                  created_at: persona.created_at ? persona.created_at.toISOString() : null,
                  updated_at: new Date().toISOString(),
                  synced_at: new Date().toISOString()
                }
              };
            } catch (error) {
              console.error(`❌ Error procesando persona ${persona.id}:`, error.message);
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

          console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(personas.length / batchSize)} sincronizado`);
          
          // Pequeña pausa entre lotes para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.serviceState.lastSync = new Date().toISOString();
        await this.updateServiceStats();

        console.log(`✅ Sincronización automática completada: ${successCount} éxitos, ${errorCount} errores`);
        
      } else {
        console.log('✅ Base de datos vectorial ya está sincronizada');
        this.serviceState.lastSync = new Date().toISOString();
      }

    } catch (error) {
      console.error('❌ Error en sincronización automática:', error.message);
      // No lanzar error para no detener el inicio del servicio
      console.log('⚠️ Servicio continuará sin sincronización completa');
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
   * 🔍 Clasificar intención de consulta usando Gemini (RAG con Qdrant)
   */
  async classifyIntent(query) {
    const prompt = `Analiza la siguiente consulta en lenguaje natural y clasifica su intención para un sistema RAG con búsqueda vectorial.

Consulta: "${query}"

Clasifica en una de estas categorías:
1. SEARCH_VECTOR - Búsqueda general semántica (ej: "buscar personas", "mostrar todos", "listar personas")
2. FILTER_VECTOR - Filtrado con parámetros específicos (ej: "personas mayores de 30", "hombres", "con cédula")
3. COUNT_VECTOR - Contar registros con filtros (ej: "cuántas personas hay", "número de mujeres mayores de edad")
4. AGGREGATE_VECTOR - Agregaciones y estadísticas (ej: "edad promedio", "distribución por género")
5. SPECIFIC_VECTOR - Búsqueda de persona específica por nombre o documento (ej: "buscar Juan Pérez", "documento 123456")
6. DEMOGRAPHIC_VECTOR - Análisis demográfico complejo (ej: "rango de edades por género", "grupos etarios")

IMPORTANTE: Todas las consultas se resolverán usando búsqueda vectorial en Qdrant.
No se usará SQL ni PostgreSQL para consultas, solo para sincronización de datos.

Responde SOLO con el nombre de la categoría (una palabra) seguido de un nivel de confianza (0-1).
Formato: CATEGORIA_VECTOR|0.95

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
      return { intent: 'SEARCH_VECTOR', confidence: 0.5 };
    }
  }

  /**
   * 🧩 Extraer parámetros de consulta usando Gemini
   */
  async extractQueryParameters(query, intent) {
    const prompt = `Analiza la siguiente consulta en lenguaje natural y extrae los parámetros de filtrado.

Consulta: "${query}"
Intención: ${intent}

Extrae estos parámetros si están presentes:
- edad_min: edad mínima (número entero o null)
- edad_max: edad máxima (número entero o null)
- genero: género específico (valores posibles: "Masculino", "Femenino", "No binario", "Prefiero no reportar", o null)
- tipo_documento: tipo de documento (valores: "Cédula", "Tarjeta de identidad", o null)
- numero_documento: número específico de documento (string o null)
- nombre: nombre o parte del nombre a buscar (string o null)
- limit: cantidad máxima de resultados a devolver (número entre 10-100, por defecto 50)

Reglas:
- Si menciona "mayor de X años" → edad_min = X
- Si menciona "menor de X años" → edad_max = X
- Si menciona "entre X y Y años" → edad_min = X, edad_max = Y
- Si menciona "adultos" → edad_min = 18
- Si menciona "menores" o "niños" → edad_max = 17
- Si menciona "adultos mayores" → edad_min = 60
- Género debe ser exacto: "Masculino", "Femenino", etc.
- Si no se especifica un parámetro, devuelve null

Responde SOLO con un objeto JSON válido. No agregues explicaciones.
Formato:
{
  "edad_min": 18,
  "edad_max": null,
  "genero": "Masculino",
  "tipo_documento": null,
  "numero_documento": null,
  "nombre": null,
  "limit": 50
}`;

    try {
      const result = await this.geminiModel.generateContent(prompt);
      let response = result.response.text().trim();
      
      // Limpiar markdown si existe
      response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const parameters = JSON.parse(response);
      console.log('📋 Parámetros extraídos:', parameters);
      
      return parameters;
    } catch (error) {
      console.error('❌ Error extrayendo parámetros:', error);
      return {
        edad_min: null,
        edad_max: null,
        genero: null,
        tipo_documento: null,
        numero_documento: null,
        nombre: null,
        limit: 50
      };
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
   * 🗄️ Consultar base de datos vectorial con filtros dinámicos
   */
  async queryVectorDatabase(query, intent, parameters) {
    try {
      console.log(`🔎 Consultando Qdrant con intent: ${intent}`);
      console.log('📋 Parámetros de filtro:', parameters);

      // Construir filtros de Qdrant
      const filters = { must: [] };

      // Filtro por edad
      if (parameters.edad_min !== null || parameters.edad_max !== null) {
        if (parameters.edad_min !== null && parameters.edad_max !== null) {
          // Rango de edad
          filters.must.push({
            key: 'edad',
            range: {
              gte: parameters.edad_min,
              lte: parameters.edad_max
            }
          });
        } else if (parameters.edad_min !== null) {
          // Solo edad mínima
          filters.must.push({
            key: 'edad',
            range: {
              gte: parameters.edad_min
            }
          });
        } else if (parameters.edad_max !== null) {
          // Solo edad máxima
          filters.must.push({
            key: 'edad',
            range: {
              lte: parameters.edad_max
            }
          });
        }
      }

      // Filtro por género
      if (parameters.genero !== null) {
        filters.must.push({
          key: 'genero',
          match: { value: parameters.genero }
        });
      }

      // Filtro por tipo de documento
      if (parameters.tipo_documento !== null) {
        filters.must.push({
          key: 'tipo_documento',
          match: { value: parameters.tipo_documento }
        });
      }

      // Filtro por número de documento específico
      if (parameters.numero_documento !== null) {
        filters.must.push({
          key: 'numero_documento',
          match: { value: parameters.numero_documento }
        });
      }

      const limit = parameters.limit || 100;

      let results = [];

      // Estrategia según intención
      if (intent === 'SPECIFIC_VECTOR' || parameters.nombre !== null) {
        // Búsqueda semántica con filtros
        console.log('🔍 Usando búsqueda semántica...');
        const queryEmbedding = await this.generateEmbedding(query);

        const searchParams = {
          vector: queryEmbedding,
          limit: limit,
          with_payload: true
        };

        // Agregar filtros solo si hay condiciones
        if (filters.must.length > 0) {
          searchParams.filter = filters;
        }

        const searchResults = await this.qdrantClient.search(this.COLLECTION_NAME, searchParams);
        
        results = searchResults.map(r => ({
          ...r.payload,
          score: r.score
        }));

      } else {
        // Scroll para obtener todos los registros con filtros
        console.log('📜 Usando scroll con filtros...');
        
        const scrollParams = {
          limit: limit,
          with_payload: true
        };

        // Agregar filtros solo si hay condiciones
        if (filters.must.length > 0) {
          scrollParams.filter = filters;
        }

        const scrollResults = await this.qdrantClient.scroll(this.COLLECTION_NAME, scrollParams);
        
        results = scrollResults.points.map(p => p.payload);
      }

      console.log(`✅ Resultados de Qdrant: ${results.length}`);

      // Para consultas de agregación, realizar cálculos
      if (intent === 'AGGREGATE_VECTOR' || intent === 'DEMOGRAPHIC_VECTOR') {
        return this.performAggregations(results, query);
      }

      // Para COUNT, devolver solo el conteo
      if (intent === 'COUNT_VECTOR') {
        return [{
          total: results.length,
          filtros_aplicados: parameters
        }];
      }

      return results;

    } catch (error) {
      console.error('❌ Error consultando Qdrant:', error);
      throw error;
    }
  }

  /**
   * 📊 Realizar agregaciones sobre resultados
   */
  performAggregations(results, query) {
    if (results.length === 0) {
      return [];
    }

    const aggregations = {
      total: results.length
    };

    // Calcular edad promedio
    const edades = results.map(r => r.edad).filter(e => e !== null && e !== undefined);
    if (edades.length > 0) {
      aggregations.edad_promedio = parseFloat((edades.reduce((a, b) => a + b, 0) / edades.length).toFixed(1));
      aggregations.edad_minima = Math.min(...edades);
      aggregations.edad_maxima = Math.max(...edades);
    }

    // Distribución por género
    const generos = {};
    results.forEach(r => {
      if (r.genero) {
        generos[r.genero] = (generos[r.genero] || 0) + 1;
      }
    });
    aggregations.distribucion_genero = generos;

    // Distribución por grupo de edad
    const grupos = {};
    results.forEach(r => {
      if (r.grupo_edad) {
        grupos[r.grupo_edad] = (grupos[r.grupo_edad] || 0) + 1;
      }
    });
    aggregations.distribucion_grupo_edad = grupos;

    // Distribución por tipo de documento
    const tipos_doc = {};
    results.forEach(r => {
      if (r.tipo_documento) {
        tipos_doc[r.tipo_documento] = (tipos_doc[r.tipo_documento] || 0) + 1;
      }
    });
    aggregations.distribucion_tipo_documento = tipos_doc;

    return [aggregations];
  }

  /**
   * 📄 Generar respuesta en Markdown desde resultados (RAG con Qdrant)
   */
  async generateMarkdownResponse(query, vectorResults, intent, useSemanticSearch = false) {
    // Detectar si son agregaciones
    const isAggregation = intent.includes('AGGREGATE') || intent.includes('DEMOGRAPHIC') || 
                          (vectorResults.length > 0 && vectorResults[0].hasOwnProperty('distribucion_genero'));
    
    const isCount = intent === 'COUNT_VECTOR' || 
                    (vectorResults.length > 0 && vectorResults[0].hasOwnProperty('total') && 
                     Object.keys(vectorResults[0]).length <= 3);

    const resultsInfo = JSON.stringify(vectorResults.slice(0, 5), null, 2);

    let prompt;

    if (isAggregation) {
      // Prompt para agregaciones
      prompt = `Eres un asistente que presenta estadísticas y análisis demográficos de manera clara en formato Markdown.

Consulta del usuario: "${query}"
Intención: ${intent}
Fuente de datos: Base de datos vectorial Qdrant

Datos de agregación:
${resultsInfo}

Genera una respuesta en formato Markdown que incluya:

1. **Título atractivo** con el tipo de análisis
2. **Resumen ejecutivo** (2-3 líneas) con los hallazgos principales
3. **Métricas clave** usando listas con negritas
4. **Tablas de distribución** si hay múltiples categorías (género, edad, etc.)
5. **Insights adicionales** interpretando los datos

Reglas importantes:
- Usa negritas (**texto**) para números y métricas importantes
- Usa tablas Markdown para distribuciones (| Categoría | Cantidad | Porcentaje |)
- Calcula porcentajes cuando presentes distribuciones
- Usa emojis sutiles para mejorar legibilidad (📊, 👥, 📈)
- Interpreta los datos de forma profesional
- Traduce nombres técnicos al español natural

NO uses bloques de código (no uses \`\`\`).
Responde SOLO en Markdown puro.`;

    } else if (isCount) {
      // Prompt para conteos
      prompt = `Eres un asistente que responde consultas de conteo de manera clara en formato Markdown.

Consulta del usuario: "${query}"
Intención: ${intent}
Fuente de datos: Base de datos vectorial Qdrant

Resultado del conteo:
${resultsInfo}

Genera una respuesta concisa en formato Markdown que incluya:

1. **Respuesta directa** con el número en negritas
2. **Contexto adicional** si hay filtros aplicados
3. **Desglose breve** si es relevante

Reglas importantes:
- Sé breve y directo
- Usa negritas para el número principal
- Menciona los filtros aplicados si existen
- Usa emojis sutiles (📊, 👥)

NO uses bloques de código (no uses \`\`\`).
Responde SOLO en Markdown puro.`;

    } else {
      // Prompt para listados normales
      prompt = `Eres un asistente que presenta resultados de búsqueda vectorial de manera clara y profesional en formato Markdown.

Consulta del usuario: "${query}"
Intención: ${intent}
Fuente de datos: Base de datos vectorial Qdrant (búsqueda semántica)
Total de resultados: ${vectorResults.length}

Muestra de datos (primeros 5 registros):
${resultsInfo}

Genera una respuesta en formato Markdown que incluya:

1. **Título relevante** (2-3 palabras)
2. **Resumen breve** (1-2 líneas) respondiendo la consulta
3. **Tabla formateada** con los datos más relevantes (máximo 6 columnas)
4. **Insights adicionales** si hay patrones interesantes

Reglas importantes:
- Usa tablas Markdown (| Columna | Columna |)
- Incluye SOLO columnas relevantes (nombre completo, edad, género, documento, correo)
- Usa negritas (**texto**) para destacar información clave
- Si hay muchos resultados (>20), menciona que se muestran los primeros N
- Formatea fechas en formato legible (DD/MM/YYYY)
- Para edades, solo el número sin "años" (se entiende por contexto)
- Traduce nombres de columnas al español natural
- Si hay un "score" de relevancia >0.8, es una coincidencia fuerte

NO uses bloques de código (no uses \`\`\`).
Responde SOLO en Markdown puro.`;
    }

    try {
      const result = await this.geminiModel.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('❌ Error generando respuesta Markdown:', error);
      
      // Fallback: generar respuesta básica según el tipo
      if (vectorResults.length === 0) {
        return '## Sin resultados\n\n❌ No se encontraron registros que coincidan con tu consulta en la base de datos vectorial.';
      }

      if (isCount) {
        return `## Resultado del Conteo\n\n**Total:** ${vectorResults[0].total} registro(s)`;
      }

      if (isAggregation) {
        const agg = vectorResults[0];
        let markdown = `## Análisis Estadístico\n\n**Total de registros:** ${agg.total}\n\n`;
        
        if (agg.edad_promedio) {
          markdown += `### Estadísticas de Edad\n\n`;
          markdown += `- **Edad promedio:** ${agg.edad_promedio} años\n`;
          markdown += `- **Edad mínima:** ${agg.edad_minima} años\n`;
          markdown += `- **Edad máxima:** ${agg.edad_maxima} años\n\n`;
        }

        if (agg.distribucion_genero) {
          markdown += `### Distribución por Género\n\n`;
          markdown += `| Género | Cantidad |\n| --- | --- |\n`;
          Object.entries(agg.distribucion_genero).forEach(([k, v]) => {
            markdown += `| ${k} | ${v} |\n`;
          });
          markdown += '\n';
        }

        return markdown;
      }

      // Fallback para listados
      let markdown = `## Resultados (${vectorResults.length} registros)\n\n`;
      
      const columns = ['nombre_completo', 'edad', 'genero', 'numero_documento', 'correo'];
      const availableColumns = columns.filter(c => vectorResults[0].hasOwnProperty(c));
      
      markdown += '| ' + availableColumns.map(c => {
        return c === 'nombre_completo' ? 'Nombre' : 
               c === 'edad' ? 'Edad' :
               c === 'genero' ? 'Género' :
               c === 'numero_documento' ? 'Documento' :
               c === 'correo' ? 'Correo' : c;
      }).join(' | ') + ' |\n';
      markdown += '| ' + availableColumns.map(() => '---').join(' | ') + ' |\n';
      
      vectorResults.slice(0, 20).forEach(row => {
        markdown += '| ' + availableColumns.map(col => row[col] || 'N/A').join(' | ') + ' |\n';
      });

      if (vectorResults.length > 20) {
        markdown += `\n*Se muestran los primeros 20 de ${vectorResults.length} resultados.*`;
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
    // POST /query - Consulta NLP Principal ⭐ (RAG con Qdrant)
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

        console.log(`🔍 Procesando consulta RAG: "${query}"`);

        // 2. Clasificar intención
        const { intent, confidence } = await this.classifyIntent(query);
        console.log(`🎯 Intención: ${intent} (confianza: ${confidence})`);

        // 3. Extraer parámetros de la consulta
        console.log('🧩 Extrayendo parámetros de la consulta...');
        const parameters = await this.extractQueryParameters(query, intent);

        // 4. Consultar base de datos vectorial (Qdrant)
        console.log('🗄️ Consultando base de datos vectorial...');
        const results = await this.queryVectorDatabase(query, intent, parameters);

        console.log(`✅ Resultados obtenidos de Qdrant: ${results.length}`);

        // 5. Generar respuesta en Markdown
        console.log('📄 Generando respuesta en Markdown...');
        const markdownResponse = await this.generateMarkdownResponse(
          query,
          results,
          intent,
          true // Siempre usamos búsqueda vectorial ahora
        );

        const processingTime = Date.now() - startTime;

        // 6. Preparar respuesta
        const response = {
          success: true,
          data: {
            markdown: markdownResponse,
            raw_results: results,
            source: 'qdrant_vector_db' // Indicar que viene de Qdrant
          },
          metadata: {
            intent: intent,
            confidence: confidence,
            results_count: results.length,
            processing_time_ms: processingTime,
            query_parameters: parameters,
            data_source: 'qdrant',
            rag_mode: true
          }
        };

        // 7. Registrar en logs
        await this.logTransaction('NLP_QUERY_RAG', query, 'SUCCESS', req, response);

        res.json(response);

      } catch (error) {
        console.error('❌ Error procesando consulta RAG:', error);
        
        const processingTime = Date.now() - startTime;
        
        await this.logTransaction('NLP_QUERY_RAG', query, 'ERROR', req, null, error.message);

        res.status(500).json({
          success: false,
          error: 'Error procesando la consulta RAG',
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

        // Crear texto para embedding (enriquecido con contexto)
        const embeddingText = `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos} 
          ${persona.tipo_documento} ${persona.numero_documento} 
          ${persona.genero} edad ${persona.edad} años ${persona.grupo_edad || ''}
          ${persona.correo_electronico} ${persona.celular}
          nacimiento ${persona.fecha_nacimiento || ''}`.trim();

        // Generar embedding
        const embedding = await this.generateEmbedding(embeddingText);

        // Almacenar en Qdrant con payload enriquecido
        await this.qdrantClient.upsert(this.COLLECTION_NAME, {
          wait: true,
          points: [
            {
              id: persona.id,
              vector: embedding,
              payload: {
                // IDs y referencias
                persona_id: persona.id,
                
                // Información personal completa
                primer_nombre: persona.primer_nombre,
                segundo_nombre: persona.segundo_nombre || null,
                apellidos: persona.apellidos,
                nombre_completo: `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos}`.trim(),
                
                // Documento
                numero_documento: persona.numero_documento,
                tipo_documento: persona.tipo_documento,
                
                // Demografía
                genero: persona.genero,
                edad: persona.edad,
                grupo_edad: persona.grupo_edad || null,
                fecha_nacimiento: persona.fecha_nacimiento ? persona.fecha_nacimiento.toISOString().split('T')[0] : null,
                
                // Contacto
                correo: persona.correo_electronico,
                correo_electronico: persona.correo_electronico, // Alias
                celular: persona.celular,
                
                // Metadatos
                created_at: persona.created_at ? persona.created_at.toISOString() : null,
                updated_at: new Date().toISOString(),
                synced_at: new Date().toISOString()
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
              // Texto enriquecido para embedding
              const embeddingText = `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos} 
                ${persona.tipo_documento} ${persona.numero_documento} 
                ${persona.genero} edad ${persona.edad} años ${persona.grupo_edad || ''}
                ${persona.correo_electronico} ${persona.celular}
                nacimiento ${persona.fecha_nacimiento || ''}`.trim();

              const embedding = await this.generateEmbedding(embeddingText);

              successCount++;
              return {
                id: persona.id,
                vector: embedding,
                payload: {
                  // IDs y referencias
                  persona_id: persona.id,
                  
                  // Información personal completa
                  primer_nombre: persona.primer_nombre,
                  segundo_nombre: persona.segundo_nombre || null,
                  apellidos: persona.apellidos,
                  nombre_completo: `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos}`.trim(),
                  
                  // Documento
                  numero_documento: persona.numero_documento,
                  tipo_documento: persona.tipo_documento,
                  
                  // Demografía
                  genero: persona.genero,
                  edad: persona.edad,
                  grupo_edad: persona.grupo_edad || null,
                  fecha_nacimiento: persona.fecha_nacimiento ? persona.fecha_nacimiento.toISOString().split('T')[0] : null,
                  
                  // Contacto
                  correo: persona.correo_electronico,
                  correo_electronico: persona.correo_electronico, // Alias
                  celular: persona.celular,
                  
                  // Metadatos
                  created_at: persona.created_at ? persona.created_at.toISOString() : null,
                  updated_at: new Date().toISOString(),
                  synced_at: new Date().toISOString()
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
      console.log('🧠 NLP Service v2.0 con RAG');
      console.log(`✅ Servidor escuchando en puerto ${this.PORT}`);
      console.log(`🔗 URL: http://localhost:${this.PORT}`);
      console.log(`📊 Health Check: http://localhost:${this.PORT}/health`);
      console.log(`📈 Estadísticas: http://localhost:${this.PORT}/stats`);
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
