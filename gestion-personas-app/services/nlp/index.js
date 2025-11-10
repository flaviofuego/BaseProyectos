require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const pgvector = require('pgvector/pg');
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

    // Configuración de Azure AI Foundry
    this.AZURE_FOUNDRY_ENDPOINT = process.env.AZURE_FOUNDRY_ENDPOINT;
    this.AZURE_EMBEDDING_MODEL = process.env.AZURE_EMBEDDING_MODEL;
    this.AZURE_CHAT_MODEL = process.env.AZURE_CHAT_MODEL;
    this.AZURE_API_KEY = process.env.AZURE_API_KEY;

    // Configuración de generación para el modelo de chat
    this.chatConfig = {
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 2048,
    };

    // Configuración de pgvector
    this.VECTOR_SIZE = 1536; // Dimensión de embeddings de Azure

    // 🎯 System Prompt Principal para el Asistente NLP
    this.SYSTEM_PROMPT = `Eres un asistente inteligente especializado en consultas de gestión de personas para una base de datos empresarial.

## 🎯 TU FUNCIÓN
Ayudar a usuarios a consultar información sobre personas registradas en la base de datos mediante lenguaje natural, utilizando búsqueda vectorial semántica con pgvector y PostgreSQL.

## 📊 DATOS DISPONIBLES
La base de datos contiene información EXCLUSIVAMENTE de personas con estos campos:
- **Identificación**: número de documento, tipo de documento (Cédula, Tarjeta de identidad)
- **Información personal**: primer nombre, segundo nombre, apellidos, fecha de nacimiento, edad (calculada), género (Masculino, Femenino, No binario, Prefiero no reportar)
- **Contacto**: correo electrónico, celular
- **Clasificación**: grupo de edad (Menor de edad, Adulto, Adulto mayor)

## ✅ CONSULTAS PERMITIDAS
Puedes responder preguntas sobre:
- Búsqueda de personas por nombre, documento, edad, género
- Estadísticas demográficas (promedios, conteos, distribuciones)
- Filtros combinados (ej: "mujeres mayores de 30 años")
- Análisis de grupos etarios
- Listados con criterios específicos

## 🚫 RESTRICCIONES IMPORTANTES
**NO DEBES**:
2. Responder preguntas sobre temas fuera del ámbito de gestión de personas
3. Inventar o asumir datos que no existen en la base de datos
4. Proporcionar información de seguridad del sistema, contraseñas, o detalles técnicos internos
5. Responder consultas sobre otros sistemas, servicios o información externa
6. Hacer análisis predictivos o especulativos sobre personas
7. Compartir datos que puedan comprometer la privacidad (ej: "dame todos los correos")

## 📝 FORMATO DE RESPUESTAS
Siempre responde en **Markdown formateado profesionalmente**:

### Para Listados de Personas:
- Usa **tablas Markdown** con columnas relevantes
- Incluye: Nombre completo, Edad, Género, Documento (solo últimos 4 dígitos si es sensible)
- Limita a 20 resultados por defecto, indica si hay más
- Ejemplo:

\`\`\`markdown
## Resultados de Búsqueda (15 personas)

| Nombre | Edad | Género | Documento |
|--------|------|--------|-----------|
| Juan Pérez García | 34 | Masculino | ****5678 |
| María López Silva | 28 | Femenino | ****9012 |

*Mostrando 15 de 15 resultados encontrados.*
\`\`\`

### Para Estadísticas:
- Usa **listas con negritas** para métricas clave
- Incluye **tablas** para distribuciones
- Agrega **insights breves** interpretando los datos
- Ejemplo:

\`\`\`markdown
## Análisis Demográfico

**Métricas Generales:**
- Total de personas: **150**
- Edad promedio: **34.5 años**
- Rango de edad: 18 - 75 años

### Distribución por Género

| Género | Cantidad | Porcentaje |
|--------|----------|------------|
| Masculino | 75 | 50% |
| Femenino | 70 | 46.7% |
| No binario | 5 | 3.3% |
\`\`\`

### Para Consultas Vacías:
Si no hay resultados, responde amablemente sugiriendo ajustar la búsqueda:

\`\`\`markdown
## Sin Resultados

❌ No se encontraron personas que coincidan con los criterios especificados.

**Sugerencias:**
- Verifica los filtros aplicados
- Intenta con criterios más amplios
- Revisa la ortografía de los nombres
\`\`\`

## 🛡️ MANEJO DE CONSULTAS INAPROPIADAS
Si el usuario pregunta algo fuera de alcance:
- Responde cortésmente indicando tu función específica
- Redirige hacia consultas válidas
- Ejemplo: "Lo siento, solo puedo ayudarte con consultas sobre personas registradas en la base de datos. ¿Te gustaría buscar información demográfica o una persona específica?"

## 🎨 ESTILO DE COMUNICACIÓN
- **Profesional y claro**: Usa lenguaje formal pero accesible
- **Conciso**: Evita explicaciones innecesarias
- **Estructurado**: Organiza la información con títulos y secciones
- **Preciso**: Reporta números exactos, no aproximaciones

## 🔐 PRIVACIDAD Y SEGURIDAD
- Si detectas una consulta sospechosa, responde con precaución

## ⚡ EFICIENCIA
- Prioriza búsquedas vectoriales semánticas para mejor precisión
- Limita resultados a cantidades manejables (10-50 registros)
- Calcula porcentajes y métricas derivadas cuando sea útil

Recuerda: Eres un asistente de consulta de base de datos, no un sistema de análisis predictivo ni un chatbot general. Mantente dentro de tu ámbito de gestión de personas y protege la privacidad de los datos.`;

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
      console.log('🚀 Iniciando NLP Service v2.0 (con pgvector)...');
      
      // Verificar conexión a PostgreSQL y registrar tipo pgvector
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
        await pgvector.registerType(client);
        console.log('✅ Conexión a PostgreSQL establecida');
      } finally {
        client.release();
      }

      // Verificar extensión pgvector
      await this.verifyPgvectorExtension();
      console.log('✅ Extensión pgvector verificada');

      // Obtener estadísticas iniciales
      await this.updateServiceStats();

      // Sincronizar embeddings automáticamente al iniciar
      console.log('🔄 Sincronizando embeddings con pgvector...');
      await this.autoSyncEmbeddings();

      this.serviceState.ready = true;
      console.log('✅ NLP Service completamente inicializado');

      this.registerService(); // Registrar en Service Registry
      
    } catch (error) {
      console.error('❌ Error inicializando servicio:', error);
      this.serviceState.ready = false;
    }
  }

  /**
   * 🗄️ Verificar extensión pgvector
   */
  async verifyPgvectorExtension() {
    try {
      const result = await this.pool.query(`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) as exists
      `);
      
      if (!result.rows[0].exists) {
        throw new Error('La extensión pgvector no está instalada. Ejecute: CREATE EXTENSION vector;');
      }

      // Verificar que la tabla personas_embeddings existe
      const tableCheck = await this.pool.query(`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'personas_embeddings'
        ) as exists
      `);

      if (!tableCheck.rows[0].exists) {
        console.log('⚠️ Tabla personas_embeddings no existe. Se creará automáticamente.');
      }
      
      console.log('✅ pgvector está instalado y configurado correctamente');
    } catch (error) {
      console.error('❌ Error verificando pgvector:', error);
      throw error;
    }
  }

  /**
   * 📊 Actualizar estadísticas del servicio
   */
  async updateServiceStats() {
    try {
      const result = await this.pool.query('SELECT COUNT(*) as total FROM personas_embeddings');
      this.serviceState.totalEmbeddings = parseInt(result.rows[0].total) || 0;
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

      // Obtener total de embeddings en pgvector
      const embeddingsResult = await this.pool.query('SELECT COUNT(*) as total FROM personas_embeddings');
      const totalEmbeddings = parseInt(embeddingsResult.rows[0].total) || 0;

      console.log(`📊 PostgreSQL: ${totalPersonasDB} personas | pgvector: ${totalEmbeddings} embeddings`);

      // Si hay diferencia, sincronizar
      if (totalPersonasDB !== totalEmbeddings) {
        console.log(`🔄 Diferencia detectada. Iniciando sincronización automática...`);
        
        // Obtener todas las personas que no tienen embedding
        const result = await this.pool.query(`
          SELECT p.* FROM personas_con_edad p
          LEFT JOIN personas_embeddings pe ON p.id = pe.persona_id
          WHERE pe.id IS NULL
          ORDER BY p.id
        `);
        const personas = result.rows;

        let successCount = 0;
        let errorCount = 0;
        const batchSize = 10;

        // Procesar en lotes
        for (let i = 0; i < personas.length; i += batchSize) {
          const batch = personas.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (persona) => {
            try {
              // Texto enriquecido para embedding
              const embeddingText = `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos} 
                ${persona.tipo_documento} ${persona.numero_documento} 
                ${persona.genero} edad ${persona.edad} años ${persona.grupo_edad || ''}
                ${persona.correo_electronico} ${persona.celular}
                nacimiento ${persona.fecha_nacimiento || ''}`.trim();

              const embedding = await this.generateEmbedding(embeddingText);

              // Insertar en pgvector
              await this.pool.query(`
                INSERT INTO personas_embeddings (persona_id, embedding, content_text)
                VALUES ($1, $2, $3)
                ON CONFLICT (persona_id) DO UPDATE
                SET embedding = EXCLUDED.embedding,
                    content_text = EXCLUDED.content_text,
                    updated_at = CURRENT_TIMESTAMP
              `, [persona.id, pgvector.toSql(embedding), embeddingText]);

              successCount++;
            } catch (error) {
              console.error(`❌ Error procesando persona ${persona.id}:`, error.message);
              errorCount++;
            }
          }));

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
   * 🤖 Método centralizado para llamadas a Azure AI Chat Completions
   * @param {Object} options - Opciones para la llamada a la API
   * @param {string} options.systemMessage - Mensaje del sistema
   * @param {string} options.userMessage - Mensaje del usuario
   * @param {number} options.temperature - Temperatura (por defecto usa this.chatConfig.temperature)
   * @param {number} options.maxTokens - Máximo de tokens (por defecto usa this.chatConfig.max_tokens)
   * @param {number} options.topP - Top P (por defecto usa this.chatConfig.top_p)
   * @param {number} options.timeout - Timeout en ms (por defecto 30000)
   * @returns {Promise<string>} - Respuesta de la IA
   */
  async callAzureAI({
    systemMessage,
    userMessage,
    temperature = this.chatConfig.temperature,
    maxTokens = this.chatConfig.max_tokens,
    topP = this.chatConfig.top_p,
    timeout = 30000
  }) {
    try {
      const response = await axios.post(
        `${this.AZURE_FOUNDRY_ENDPOINT}/openai/deployments/${this.AZURE_CHAT_MODEL}/chat/completions?api-version=2025-01-01-preview`,
        {
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
          ],
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.AZURE_API_KEY,
          },
          timeout,
        }
      );

      return response.data.choices?.[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('❌ Error en llamada a Azure AI:', error.message);
      throw error;
    }
  }

  /**
   * 🤖 Generar embedding usando Azure AI Foundry
   */
  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        `${this.AZURE_FOUNDRY_ENDPOINT}/openai/deployments/${this.AZURE_EMBEDDING_MODEL}/embeddings?api-version=2023-05-15`,
        {
          model: this.AZURE_EMBEDDING_MODEL,
          input: text,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.AZURE_API_KEY,
          },
          timeout: 30000,
        }
      );
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('❌ Error generando embedding:', error);
      throw error;
    }
  }

  /**
   * 🔍 Clasificar intención de consulta usando Azure AI Foundry (RAG con pgvector)
   */
  async classifyIntent(query) {
    const prompt = `${this.SYSTEM_PROMPT}

## TAREA ACTUAL: Clasificación de Intención

Analiza la siguiente consulta y clasifica su intención:

**Consulta del usuario**: "${query}"

**Categorías disponibles**:
1. **SEARCH_VECTOR** - Búsqueda general semántica (ej: "buscar personas", "mostrar todos", "listar personas")
2. **FILTER_VECTOR** - Filtrado con parámetros específicos (ej: "personas mayores de 30", "hombres", "con cédula")
3. **COUNT_VECTOR** - Contar registros con filtros (ej: "cuántas personas hay", "número de mujeres mayores de edad")
4. **AGGREGATE_VECTOR** - Agregaciones y estadísticas (ej: "edad promedio", "distribución por género")
5. **SPECIFIC_VECTOR** - Búsqueda de persona específica por nombre o documento (ej: "buscar Juan Pérez", "documento 123456")
6. **DEMOGRAPHIC_VECTOR** - Análisis demográfico complejo (ej: "rango de edades por género", "grupos etarios")
7. **INVALID_QUERY** - Consulta fuera de alcance o inapropiada (información sensible, temas no relacionados)

**IMPORTANTE**:
- Si la consulta no está relacionada con gestión de personas, usa INVALID_QUERY
- Todas las consultas válidas se resolverán usando búsqueda vectorial en pgvector

**Formato de respuesta**:
Responde SOLO con: CATEGORIA_VECTOR|0.95

No agregues explicaciones adicionales.`;

    try {
      const text = await this.callAzureAI({
        systemMessage: 'Eres un asistente experto en clasificación de intenciones.',
        userMessage: prompt,
        temperature: this.chatConfig.temperature,
        maxTokens: 100
      });

      const [intent, confidence] = (text || 'SEARCH_VECTOR|0.5').split('|');
      
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
   * 🧩 Extraer parámetros de consulta usando Azure AI Foundry
   */
  async extractQueryParameters(query, intent) {
    const prompt = `${this.SYSTEM_PROMPT}

## TAREA ACTUAL: Extracción de Parámetros de Consulta

Analiza la siguiente consulta y extrae los parámetros de filtrado para búsqueda en la base de datos.

**Consulta del usuario**: "${query}"
**Intención detectada**: ${intent}

**Parámetros a extraer**:
- **edad_min**: edad mínima (número entero o null)
- **edad_max**: edad máxima (número entero o null)
- **genero**: género específico (valores EXACTOS: "Masculino", "Femenino", "No binario", "Prefiero no reportar", o null)
- **tipo_documento**: tipo de documento (valores EXACTOS: "Cédula", "Tarjeta de identidad", o null)
- **numero_documento**: número específico de documento (string o null)
- **nombre**: nombre o parte del nombre a buscar (string o null)
- **limit**: cantidad máxima de resultados (número entre 10-100, por defecto 50)

**Reglas de interpretación**:
- "mayor de X años" → edad_min = X
- "menor de X años" → edad_max = X
- "entre X y Y años" → edad_min = X, edad_max = Y
- "adultos" → edad_min = 18
- "menores" o "niños" → edad_max = 17
- "adultos mayores" o "tercera edad" → edad_min = 60
- "jóvenes" → edad_min = 18, edad_max = 35
- Género debe ser EXACTO como aparece en la base de datos
- Tipo de documento debe ser EXACTO: "Cédula" o "Tarjeta de identidad"
- Si no se especifica un parámetro, devuelve null
- Para consultas masivas sospechosas (ej: "todos los correos"), limita a 10

**Formato de respuesta**:
Responde SOLO con un objeto JSON válido. NO agregues explicaciones, markdown ni bloques de código.

Ejemplo:
{
  "edad_min": 18,
  "edad_max": null,
  "genero": "Masculino",
  "tipo_documento": null,
  "numero_documento": null,
  "nombre": null,
  "limit": 50
}

Responde ahora:`;

    try {
      let text = await this.callAzureAI({
        systemMessage: 'Eres un asistente experto en extracción de parámetros de consultas.',
        userMessage: prompt,
        temperature: 0.3, // Temperatura baja para respuestas más precisas
        maxTokens: 500
      });
      
      // Limpiar markdown si existe
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
      
      const parameters = JSON.parse(text);
      console.log('📋 Parámetros extraídos:', parameters);
      
      // Validar y sanitizar parámetros
      const sanitized = {
        edad_min: parameters.edad_min && !isNaN(parameters.edad_min) ? parseInt(parameters.edad_min) : null,
        edad_max: parameters.edad_max && !isNaN(parameters.edad_max) ? parseInt(parameters.edad_max) : null,
        genero: ['Masculino', 'Femenino', 'No binario', 'Prefiero no reportar'].includes(parameters.genero) ? parameters.genero : null,
        tipo_documento: ['Cédula', 'Tarjeta de identidad'].includes(parameters.tipo_documento) ? parameters.tipo_documento : null,
        numero_documento: parameters.numero_documento || null,
        nombre: parameters.nombre || null,
        limit: parameters.limit && !isNaN(parameters.limit) ? Math.min(Math.max(parseInt(parameters.limit), 10), 100) : 50
      };
      
      console.log('✅ Parámetros sanitizados:', sanitized);
      return sanitized;
      
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
   * ️ Consultar base de datos vectorial con filtros dinámicos
   */
  async queryVectorDatabase(query, intent, parameters) {
    try {
      console.log(`🔎 Consultando pgvector con intent: ${intent}`);
      console.log('📋 Parámetros de filtro:', parameters);

      const queryEmbedding = await this.generateEmbedding(query);

      // Construir consulta SQL con filtros dinámicos
      const whereClauses = [];
      const queryParams = [];
      let paramCounter = 1;

      // Filtro por edad
      if (parameters.edad_min !== null && parameters.edad_max !== null) {
        whereClauses.push(`EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) BETWEEN $${paramCounter} AND $${paramCounter + 1}`);
        queryParams.push(parameters.edad_min, parameters.edad_max);
        paramCounter += 2;
      } else if (parameters.edad_min !== null) {
        whereClauses.push(`EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) >= $${paramCounter}`);
        queryParams.push(parameters.edad_min);
        paramCounter++;
      } else if (parameters.edad_max !== null) {
        whereClauses.push(`EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) <= $${paramCounter}`);
        queryParams.push(parameters.edad_max);
        paramCounter++;
      }

      // Filtro por género
      if (parameters.genero !== null) {
        whereClauses.push(`p.genero = $${paramCounter}`);
        queryParams.push(parameters.genero);
        paramCounter++;
      }

      // Filtro por tipo de documento
      if (parameters.tipo_documento !== null) {
        whereClauses.push(`p.tipo_documento = $${paramCounter}`);
        queryParams.push(parameters.tipo_documento);
        paramCounter++;
      }

      // Filtro por número de documento específico
      if (parameters.numero_documento !== null) {
        whereClauses.push(`p.numero_documento = $${paramCounter}`);
        queryParams.push(parameters.numero_documento);
        paramCounter++;
      }

      // Filtro por nombre
      if (parameters.nombre !== null) {
        whereClauses.push(`(p.primer_nombre ILIKE $${paramCounter} OR p.segundo_nombre ILIKE $${paramCounter} OR p.apellidos ILIKE $${paramCounter})`);
        queryParams.push(`%${parameters.nombre}%`);
        paramCounter++;
      }

      const limit = parameters.limit || 100;

      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      
      const sqlQuery = `
        SELECT 
          p.*,
          EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) AS edad,
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) < 18 THEN 'Menor de edad'
            WHEN EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) BETWEEN 18 AND 65 THEN 'Adulto'
            ELSE 'Adulto mayor'
          END AS grupo_edad,
          1 - (pe.embedding <=> $${paramCounter}) AS similarity
        FROM personas_embeddings pe
        JOIN personas p ON pe.persona_id = p.id
        ${whereSQL}
        ORDER BY pe.embedding <=> $${paramCounter}
        LIMIT $${paramCounter + 1}
      `;

      queryParams.push(pgvector.toSql(queryEmbedding), limit);
      const result = await this.pool.query(sqlQuery, queryParams);
      const results = result.rows;

      console.log(`✅ Resultados de búsqueda vectorial: ${results.length}`);
      if (results.length > 0 && results[0].similarity) {
        console.log(`📊 Similitud promedio: ${(results.reduce((acc, r) => acc + r.similarity, 0) / results.length).toFixed(4)}`);
      }

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
      console.error('❌ Error consultando pgvector:', error);
      throw error;
    }
  }

  /**
   * 📊 Realizar agregaciones sobre resultados
   */
  performAggregations(results, query) {
    if (results.length === 0) return [];

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

    // Distribución por género, grupo de edad y tipo de documento
    const generos = {};
    const grupos = {};
    const tipos_doc = {};
    results.forEach(r => {
      if (r.genero) {
        generos[r.genero] = (generos[r.genero] || 0) + 1;
      }

      if (r.grupo_edad) {
        grupos[r.grupo_edad] = (grupos[r.grupo_edad] || 0) + 1;
      }

      if (r.tipo_documento) {
        tipos_doc[r.tipo_documento] = (tipos_doc[r.tipo_documento] || 0) + 1;
      }
    });
    aggregations.distribucion_genero = generos;
    aggregations.distribucion_grupo_edad = grupos;
    aggregations.distribucion_tipo_documento = tipos_doc;

    return [aggregations];
  }

  /**
   * 📄 Generar respuesta en Markdown desde resultados (RAG con Qdrant)
   */
  async generateMarkdownResponse(query, vectorResults, intent, useSemanticSearch = false) {
    // Detectar consultas inválidas
    if (intent === 'INVALID_QUERY') {
      return `## ⚠️ Consulta Fuera de Alcance

Lo siento, solo puedo ayudarte con **consultas sobre personas registradas** en la base de datos.

**Puedo ayudarte con**:
- 🔍 Búsqueda de personas por nombre, documento o características
- 📊 Estadísticas demográficas (promedios, conteos, distribuciones)
- 👥 Análisis de grupos etarios y género
- 📋 Listados con criterios específicos

**No puedo ayudarte con**:
- ❌ Información sensible masiva (correos, teléfonos de todos)
- ❌ Temas fuera de gestión de personas
- ❌ Información del sistema o seguridad
- ❌ Predicciones o análisis especulativos

¿Quieres reformular tu consulta?`;
    }

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
      prompt = `${this.SYSTEM_PROMPT}

## TAREA ACTUAL: Generar Respuesta de Análisis Estadístico

**Consulta del usuario**: "${query}"
**Intención detectada**: ${intent}
**Fuente de datos**: PostgreSQL con pgvector (búsqueda vectorial semántica)

**Datos de agregación**:
\`\`\`json
${resultsInfo}
\`\`\`

**Tu tarea**:
Genera una respuesta profesional en formato Markdown que incluya:

1. **Título atractivo** (## Análisis...) con emoji relevante
2. **Métricas clave** en lista con negritas
3. **Tablas de distribución** con columnas: Categoría | Cantidad | Porcentaje
4. **Insights breves** (2-3 líneas) interpretando los datos
5. **Protección de privacidad**: No reveles información sensible individual

**Reglas estrictas**:
- Usa negritas (**texto**) para números y métricas importantes
- Calcula porcentajes para todas las distribuciones
- Usa emojis sutiles (📊, 👥, 📈, ✅)
- NO uses bloques de código con \`\`\` (excepto para datos JSON si es necesario)
- Responde SOLO en Markdown formateado
- Si detectas datos sensibles, anonimiza o omite

Responde ahora:`;

    } else if (isCount) {
      // Prompt para conteos
      prompt = `${this.SYSTEM_PROMPT}

## TAREA ACTUAL: Generar Respuesta de Conteo

**Consulta del usuario**: "${query}"
**Intención detectada**: ${intent}
**Fuente de datos**: PostgreSQL con pgvector

**Resultado del conteo**:
\`\`\`json
${resultsInfo}
\`\`\`

**Tu tarea**:
Genera una respuesta concisa en formato Markdown:

1. **Título breve** (## Resultado del Conteo)
2. **Número principal** en negritas con emoji
3. **Contexto adicional** si hay filtros aplicados (edad, género, etc.)
4. **Sugerencia** si el resultado es 0

**Reglas estrictas**:
- Sé directo y breve
- Usa negritas para el número principal
- Emoji relevante (📊, 👥, ✅, ❌)
- NO uses bloques de código
- Si es 0 resultados, sugiere ajustar la búsqueda

Responde ahora:`;

    } else {
      // Prompt para listados normales
      prompt = `${this.SYSTEM_PROMPT}

## TAREA ACTUAL: Generar Respuesta de Búsqueda

**Consulta del usuario**: "${query}"
**Intención detectada**: ${intent}
**Fuente de datos**: PostgreSQL con pgvector (búsqueda vectorial semántica)
**Total de resultados**: ${vectorResults.length}

**Muestra de datos** (primeros 5 registros):
\`\`\`json
${resultsInfo}
\`\`\`

**Tu tarea**:
Genera una respuesta profesional en formato Markdown:

1. **Título relevante** (## Resultados de Búsqueda) con emoji
2. **Resumen breve** (1 línea) del tipo de búsqueda
3. **Tabla Markdown formateada** con columnas relevantes:
   - Nombre completo
   - Edad
   - Género
   - Documento (solo últimos 4 dígitos: ****1234)
   - Correo (solo si es consulta específica, NO para listados masivos)
4. **Nota al final** si hay más de 20 resultados (*Mostrando X de Y resultados*)

**Reglas estrictas**:
- Usa tablas Markdown: | Columna | Columna |
- **PROTEGE PRIVACIDAD**: Anonimiza documentos (****5678), NO muestres correos en listados masivos
- Limita tabla a 20 filas máximo
- Usa negritas para destacar datos importantes
- NO uses bloques de código
- Si hay score de similitud >0.8, menciona "alta coincidencia"
- Traduce nombres de columnas al español natural

Responde ahora:`;
    }

    try {
      const text = await this.callAzureAI({
        systemMessage: 'Eres un asistente experto en análisis de datos y generación de respuestas en Markdown.',
        userMessage: prompt,
        temperature: this.chatConfig.temperature,
        maxTokens: this.chatConfig.max_tokens
      });

      return text || 'Sin respuesta disponible.';
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
            pgvector: false,
            azure_ai_foundry: false
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

        // Verificar pgvector
        try {
          const result = await this.pool.query(`
            SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists
          `);
          health.dependencies.pgvector = result.rows[0].exists;
        } catch (error) {
          console.error('pgvector health check failed:', error);
        }

        // Verificar Azure AI Foundry
        health.dependencies.azure_ai_foundry = !!(process.env.AZURE_FOUNDRY_ENDPOINT && process.env.AZURE_API_KEY);

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
    // POST /query - Consulta NLP Principal ⭐ (RAG con pgvector)
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

        // Almacenar en pgvector
        await this.pool.query(`
          INSERT INTO personas_embeddings (persona_id, embedding, content_text)
          VALUES ($1, $2, $3)
          ON CONFLICT (persona_id) DO UPDATE
          SET embedding = EXCLUDED.embedding,
              content_text = EXCLUDED.content_text,
              updated_at = CURRENT_TIMESTAMP
        `, [persona.id, pgvector.toSql(embedding), embeddingText]);

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
          
          await Promise.all(batch.map(async (persona) => {
            try {
              // Texto enriquecido para embedding
              const embeddingText = `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos} 
                ${persona.tipo_documento} ${persona.numero_documento} 
                ${persona.genero} edad ${persona.edad} años ${persona.grupo_edad || ''}
                ${persona.correo_electronico} ${persona.celular}
                nacimiento ${persona.fecha_nacimiento || ''}`.trim();

              const embedding = await this.generateEmbedding(embeddingText);

              // Insertar en pgvector
              await this.pool.query(`
                INSERT INTO personas_embeddings (persona_id, embedding, content_text)
                VALUES ($1, $2, $3)
                ON CONFLICT (persona_id) DO UPDATE
                SET embedding = EXCLUDED.embedding,
                    content_text = EXCLUDED.content_text,
                    updated_at = CURRENT_TIMESTAMP
              `, [persona.id, pgvector.toSql(embedding), embeddingText]);

              successCount++;
            } catch (error) {
              console.error(`❌ Error procesando persona ${persona.id}:`, error);
              errorCount++;
            }
          }));

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

        // Estadísticas de pgvector
        const embeddingsStats = await this.pool.query(`
          SELECT COUNT(*) as total_embeddings FROM personas_embeddings
        `);

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
              total_embeddings: parseInt(embeddingsStats.rows[0].total_embeddings),
              vector_size: 1536,
              distance_metric: 'cosine'
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
        description: 'Advanced Natural Language Processing service with RAG capabilities using Azure AI Foundry and PostgreSQL pgvector',
        maintainer: 'nlp-team',
        healthEndpoint: '/health',
        tags: ['nlp', 'ai', 'azure', 'azure-ai-foundry', 'vector-search', 'embeddings', 'pgvector', 'postgresql', 'rag', 'semantic-search'],
        capabilities: [
          'natural-language-query',
          'vector-search',
          'embeddings-generation',
          'semantic-search',
          'azure-ai-foundry',
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
      console.log('🧠 NLP Service v2.0 con RAG (pgvector + Azure AI Foundry)');
      console.log(`✅ Servidor escuchando en puerto ${this.PORT}`);
      console.log(`🔗 URL: http://localhost:${this.PORT}`);
      console.log(`📊 Health Check: http://localhost:${this.PORT}/health`);
      console.log(`📈 Estadísticas: http://localhost:${this.PORT}/stats`);
      console.log(`🗄️ Vector Database: PostgreSQL con pgvector`);
      console.log(`☁️ AI Provider: Azure AI Foundry`);
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

