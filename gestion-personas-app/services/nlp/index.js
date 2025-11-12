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
    
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.AZURE_FOUNDRY_ENDPOINT = process.env.AZURE_FOUNDRY_ENDPOINT;
    this.AZURE_EMBEDDING_MODEL = process.env.AZURE_EMBEDDING_MODEL;
    this.AZURE_CHAT_MODEL = process.env.AZURE_CHAT_MODEL;
    this.AZURE_API_KEY = process.env.AZURE_API_KEY;

    this.chatConfig = { temperature: 0.7, top_p: 0.95, max_tokens: 2048 };
    this.VECTOR_SIZE = 1536;
    
    this.SYSTEM_PROMPT = this.buildSystemPrompt();
    this.serviceState = { ready: false, lastSync: null, totalEmbeddings: 0, startTime: Date.now() };

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeService();
  }

  buildSystemPrompt() {
    return `Eres un asistente inteligente especializado en consultas de gestión de personas para una base de datos empresarial.

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

## 📝 FORMATO DE RESPUESTAS
Siempre responde en **Markdown formateado profesionalmente**:

### Para Listados de Personas:
- Usa **tablas Markdown** con columnas que consideres relevantes según la consulta

\`\`\`markdown
## Resultados ejemplo de Búsqueda (15 personas)

| Nombre | Edad | Género | Documento |
|--------|------|--------|-----------|
| Juan Pérez García | 34 | Masculino | e54655678 |
| María López Silva | 28 | Femenino | 4543549012 |

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
- **Emojis**: evita el uso de emojis en las respuestas para mantener un tono profesional.

## 🔐 PRIVACIDAD Y SEGURIDAD
- Si detectas una consulta sospechosa, responde con precaución

## ⚡ EFICIENCIA
- Prioriza búsquedas vectoriales semánticas para mejor precisión
- Calcula porcentajes y métricas derivadas cuando sea útil

Recuerda: Eres un asistente de consulta de base de datos, no un sistema de análisis predictivo ni un chatbot general. Mantente dentro de tu ámbito de gestión de personas y protege la privacidad de los datos.`;
  }

  setupMiddleware() {
    this.app.use(helmet(), cors(), compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => console.log(`${req.method} ${req.path} - ${res.statusCode} - ${Date.now() - start}ms`));
      next();
    });
  }

  async initializeService() {
    try {
      console.log('🚀 Iniciando NLP Service v2.0...');
      
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
        await pgvector.registerType(client);
      } finally {
        client.release();
      }

      await this.verifyPgvectorExtension();
      await this.updateServiceStats();
      await this.autoSyncEmbeddings();

      this.serviceState.ready = true;
      console.log('✅ Servicio inicializado');
      this.registerService();
    } catch (error) {
      console.error('❌ Error inicializando:', error.message);
      this.serviceState.ready = false;
    }
  }

  async verifyPgvectorExtension() {
    const extensionCheck = await this.pool.query(`SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists`);
    if (!extensionCheck.rows[0].exists) throw new Error('pgvector no instalado');

    const tableCheck = await this.pool.query(`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'personas_embeddings') as exists`);
    if (!tableCheck.rows[0].exists) console.log('⚠️ Tabla personas_embeddings no existe');
  }

  async updateServiceStats() {
    try {
      const result = await this.pool.query('SELECT COUNT(*) as total FROM personas_embeddings');
      this.serviceState.totalEmbeddings = parseInt(result.rows[0].total) || 0;
    } catch (error) {
      console.error('Error actualizando stats:', error.message);
    }
  }

  async autoSyncEmbeddings() {
    try {
      const dbResult = await this.pool.query('SELECT COUNT(*) as total FROM personas_con_edad');
      const totalPersonasDB = parseInt(dbResult.rows[0].total);
      const embeddingsResult = await this.pool.query('SELECT COUNT(*) as total FROM personas_embeddings');
      const totalEmbeddings = parseInt(embeddingsResult.rows[0].total) || 0;

      console.log(`DB: ${totalPersonasDB} personas | Vector: ${totalEmbeddings} embeddings`);

      if (totalPersonasDB === totalEmbeddings) {
        console.log('✅ Sincronizado');
        this.serviceState.lastSync = new Date().toISOString();
        return;
      }

      console.log('🔄 Sincronizando...');
      const result = await this.pool.query(`
        SELECT p.* FROM personas_con_edad p
        LEFT JOIN personas_embeddings pe ON p.id = pe.persona_id
        WHERE pe.id IS NULL ORDER BY p.id
      `);

      const { successCount, errorCount } = await this.processBatchEmbeddings(result.rows);
      
      this.serviceState.lastSync = new Date().toISOString();
      await this.updateServiceStats();
      console.log(`✅ Sync: ${successCount} éxitos, ${errorCount} errores`);
    } catch (error) {
      console.error('Error sync:', error.message);
    }
  }

  async processBatchEmbeddings(personas, batchSize = 10) {
    let successCount = 0, errorCount = 0;

    for (let i = 0; i < personas.length; i += batchSize) {
      const batch = personas.slice(i, i + batchSize);
      await Promise.all(batch.map(async (persona) => {
        try {
          const embeddingText = this.buildEmbeddingText(persona);
          const embedding = await this.generateEmbedding(embeddingText);
          await this.pool.query(`
            INSERT INTO personas_embeddings (persona_id, embedding, content_text)
            VALUES ($1, $2, $3)
            ON CONFLICT (persona_id) DO UPDATE SET embedding = EXCLUDED.embedding, content_text = EXCLUDED.content_text, updated_at = CURRENT_TIMESTAMP
          `, [persona.id, pgvector.toSql(embedding), embeddingText]);
          successCount++;
        } catch (error) {
          console.error(`Error persona ${persona.id}:`, error.message);
          errorCount++;
        }
      }));
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return { successCount, errorCount };
  }

  buildEmbeddingText(persona) {
    return `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos} 
      ${persona.tipo_documento} ${persona.numero_documento} 
      ${persona.genero} edad ${persona.edad} años ${persona.grupo_edad || ''}
      ${persona.correo_electronico} ${persona.celular}
      nacimiento ${persona.fecha_nacimiento || ''}`.trim();
  }

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
        status,
        error_message: error
      }, { timeout: 5000 });
    } catch (logError) {
      console.error('Error log:', logError.message);
    }
  }

  async callAzureAI({ systemMessage, userMessage, temperature = this.chatConfig.temperature, maxTokens = this.chatConfig.max_tokens, topP = this.chatConfig.top_p, timeout = 30000 }) {
    const response = await axios.post(
      `${this.AZURE_FOUNDRY_ENDPOINT}/openai/deployments/${this.AZURE_CHAT_MODEL}/chat/completions?api-version=2025-01-01-preview`,
      {
        messages: [{ role: 'system', content: systemMessage }, { role: 'user', content: userMessage }],
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
      },
      { headers: { 'Content-Type': 'application/json', 'api-key': this.AZURE_API_KEY }, timeout }
    );
    return response.data.choices?.[0]?.message?.content?.trim() || '';
  }

  async generateEmbedding(text) {
    const response = await axios.post(
      `${this.AZURE_FOUNDRY_ENDPOINT}/openai/deployments/${this.AZURE_EMBEDDING_MODEL}/embeddings?api-version=2023-05-15`,
      { model: this.AZURE_EMBEDDING_MODEL, input: text },
      { headers: { 'Content-Type': 'application/json', 'api-key': this.AZURE_API_KEY }, timeout: 30000 }
    );
    return response.data.data[0].embedding;
  }

  async classifyIntent(query) {
    const prompt = `${this.SYSTEM_PROMPT}

Clasifica la intención de: "${query}"

Categorías: SEARCH_VECTOR, FILTER_VECTOR, COUNT_VECTOR, AGGREGATE_VECTOR, SPECIFIC_VECTOR, DEMOGRAPHIC_VECTOR, INVALID_QUERY

Responde: CATEGORIA|0.95`;

    try {
      const text = await this.callAzureAI({
        systemMessage: 'Clasificador de intenciones de consultas.',
        userMessage: prompt,
        temperature: 0.3,
        maxTokens: 50
      });
      const [intent, confidence] = (text || 'SEARCH_VECTOR|0.5').split('|');
      return { intent: intent.trim(), confidence: parseFloat(confidence) || 0.8 };
    } catch (error) {
      console.error('Error clasificación:', error.message);
      return { intent: 'SEARCH_VECTOR', confidence: 0.5 };
    }
  }

  async extractQueryParameters(query, intent) {
    const prompt = `${this.SYSTEM_PROMPT}

Extrae parámetros de: "${query}" (intent: ${intent})

Parámetros: edad_min, edad_max, genero ("Masculino"|"Femenino"|"No binario"|"Prefiero no reportar"), tipo_documento ("Cédula"|"Tarjeta de identidad"), numero_documento, nombre, limit (10-200, default 50)

Reglas: "mayor de X"→edad_min=X, "menor de X"→edad_max=X, "adultos"→edad_min=18, "menores"→edad_max=17, "adultos mayores"→edad_min=60

Responde JSON sin markdown:
{"edad_min":null,"edad_max":null,"genero":null,"tipo_documento":null,"numero_documento":null,"nombre":null,"limit":numero(si es necesario)}`;

    try {
      let text = await this.callAzureAI({
        systemMessage: 'Extractor de parámetros.',
        userMessage: prompt,
        temperature: 0.3,
        maxTokens: 300
      });
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
      const params = JSON.parse(text);
      
      return {
        edad_min: params.edad_min && !isNaN(params.edad_min) ? parseInt(params.edad_min) : null,
        edad_max: params.edad_max && !isNaN(params.edad_max) ? parseInt(params.edad_max) : null,
        genero: ['Masculino', 'Femenino', 'No binario', 'Prefiero no reportar'].includes(params.genero) ? params.genero : null,
        tipo_documento: ['Cédula', 'Tarjeta de identidad'].includes(params.tipo_documento) ? params.tipo_documento : null,
        numero_documento: params.numero_documento || null,
        nombre: params.nombre || null,
        limit: params.limit && !isNaN(params.limit) ? Math.min(Math.max(parseInt(params.limit), 10), 100) : 50
      };
    } catch (error) {
      console.error('Error extracción params:', error.message);
      return { edad_min: null, edad_max: null, genero: null, tipo_documento: null, numero_documento: null, nombre: null, limit: 50 };
    }
  }

  async queryVectorDatabase(query, intent, parameters) {
    const queryEmbedding = await this.generateEmbedding(query);
    const { whereClauses, queryParams, paramCounter } = this.buildWhereClause(parameters);
    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const sqlQuery = `
      SELECT p.*, EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) AS edad,
      CASE WHEN EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) < 18 THEN 'Menor de edad'
           WHEN EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) BETWEEN 18 AND 65 THEN 'Adulto'
           ELSE 'Adulto mayor' END AS grupo_edad,
      1 - (pe.embedding <=> $${paramCounter}) AS similarity
      FROM personas_embeddings pe
      JOIN personas p ON pe.persona_id = p.id
      ${whereSQL}
      ORDER BY pe.embedding <=> $${paramCounter}
      LIMIT $${paramCounter + 1}
    `;

    queryParams.push(pgvector.toSql(queryEmbedding), parameters.limit || 100);
    const results = (await this.pool.query(sqlQuery, queryParams)).rows;

    if (intent === 'AGGREGATE_VECTOR' || intent === 'DEMOGRAPHIC_VECTOR') return this.performAggregations(results);
    if (intent === 'COUNT_VECTOR') return [{ total: results.length, filtros_aplicados: parameters }];
    return results;
  }

  buildWhereClause(params) {
    const whereClauses = [];
    const queryParams = [];
    let paramCounter = 1;

    if (params.edad_min !== null && params.edad_max !== null) {
      whereClauses.push(`EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) BETWEEN $${paramCounter} AND $${paramCounter + 1}`);
      queryParams.push(params.edad_min, params.edad_max);
      paramCounter += 2;
    } else if (params.edad_min !== null) {
      whereClauses.push(`EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) >= $${paramCounter}`);
      queryParams.push(params.edad_min);
      paramCounter++;
    } else if (params.edad_max !== null) {
      whereClauses.push(`EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) <= $${paramCounter}`);
      queryParams.push(params.edad_max);
      paramCounter++;
    }

    if (params.genero) {
      whereClauses.push(`p.genero = $${paramCounter++}`);
      queryParams.push(params.genero);
    }
    if (params.tipo_documento) {
      whereClauses.push(`p.tipo_documento = $${paramCounter++}`);
      queryParams.push(params.tipo_documento);
    }
    if (params.numero_documento) {
      whereClauses.push(`p.numero_documento = $${paramCounter++}`);
      queryParams.push(params.numero_documento);
    }
    if (params.nombre) {
      whereClauses.push(`(p.primer_nombre ILIKE $${paramCounter} OR p.segundo_nombre ILIKE $${paramCounter} OR p.apellidos ILIKE $${paramCounter})`);
      queryParams.push(`%${params.nombre}%`);
      paramCounter++;
    }

    return { whereClauses, queryParams, paramCounter };
  }

  performAggregations(results) {
    if (results.length === 0) return [];

    const edades = results.map(r => r.edad).filter(e => e != null);
    const aggregations = { total: results.length };

    if (edades.length > 0) {
      aggregations.edad_promedio = parseFloat((edades.reduce((a, b) => a + b, 0) / edades.length).toFixed(1));
      aggregations.edad_minima = Math.min(...edades);
      aggregations.edad_maxima = Math.max(...edades);
    }

    const countBy = (field) => results.reduce((acc, r) => (r[field] && (acc[r[field]] = (acc[r[field]] || 0) + 1), acc), {});
    aggregations.distribucion_genero = countBy('genero');
    aggregations.distribucion_grupo_edad = countBy('grupo_edad');
    aggregations.distribucion_tipo_documento = countBy('tipo_documento');

    return [aggregations];
  }

  async generateMarkdownResponse(query, vectorResults, intent) {
    if (intent === 'INVALID_QUERY') {
      return `## Consulta Fuera de Alcance\n\nSolo puedo ayudar con consultas sobre personas registradas.\n\n**Puedo**: Búsqueda, estadísticas, análisis demográfico.\n**No puedo**: Información sensible masiva, temas externos, predicciones.`;
    }

    const isAggregation = intent.includes('AGGREGATE') || intent.includes('DEMOGRAPHIC') || (vectorResults[0]?.distribucion_genero);
    const isCount = intent === 'COUNT_VECTOR' || (vectorResults[0]?.total && Object.keys(vectorResults[0]).length <= 3);
    const resultsInfo = JSON.stringify(vectorResults.slice(0, 5), null, 2);

    const prompts = {
      aggregation: `${this.SYSTEM_PROMPT}\n\nTarea: Análisis estadístico de "${query}"\nDatos:\n${resultsInfo}\n\nGenera Markdown con título, métricas en negritas, tablas con porcentajes. Sin código.`,
      count: `${this.SYSTEM_PROMPT}\n\nTarea: Conteo de "${query}"\nDatos:\n${resultsInfo}\n\nGenera Markdown breve con número en negritas y contexto.`,
      listing: `${this.SYSTEM_PROMPT}\n\nTarea: Búsqueda "${query}" (${vectorResults.length} resultados)\nMuestra:\n${resultsInfo}\n\nGenera Markdown con tabla, columnas relevantes`
    };

    const promptType = isAggregation ? 'aggregation' : isCount ? 'count' : 'listing';

    try {
      return await this.callAzureAI({
        systemMessage: this.SYSTEM_PROMPT,
        userMessage: prompts[promptType],
        temperature: this.chatConfig.temperature,
        maxTokens: this.chatConfig.max_tokens
      }) || 'Sin respuesta.';
    } catch (error) {
      console.error('Error generando markdown:', error.message);
      return this.generateFallbackMarkdown(vectorResults, isCount, isAggregation);
    }
  }

  generateFallbackMarkdown(results, isCount, isAggregation) {
    if (results.length === 0) return '## Sin resultados\n\nNo se encontraron registros.';
    if (isCount) return `## Conteo\n\n**Total:** ${results[0].total}`;
    
    if (isAggregation) {
      const agg = results[0];
      let md = `## Análisis\n\n**Total:** ${agg.total}\n\n`;
      if (agg.edad_promedio) md += `**Edad promedio:** ${agg.edad_promedio} años\n`;
      if (agg.distribucion_genero) {
        md += `\n| Género | Cantidad |\n|---|---|\n`;
        Object.entries(agg.distribucion_genero).forEach(([k, v]) => md += `| ${k} | ${v} |\n`);
      }
      return md;
    }

    let md = `## Resultados (${results.length})\n\n| Nombre | Edad | Género |\n|---|---|---|\n`;
    results.slice(0, 20).forEach(r => md += `| ${r.primer_nombre || 'N/A'} ${r.apellidos || ''} | ${r.edad || 'N/A'} | ${r.genero || 'N/A'} |\n`);
    if (results.length > 20) md += `\n*Mostrando 20 de ${results.length}*`;
    return md;
  }

  async checkDB() {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async checkPgVector() {
    try {
      const result = await this.pool.query(`SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists`);
      return result.rows[0].exists;
    } catch {
      return false;
    }
  }

  setupRoutes() {
    this.app.get('/health', async (req, res) => {
      try {
        const health = {
          status: this.serviceState.ready ? 'healthy' : 'starting',
          service: 'nlp-service-v2',
          version: '2.0.0',
          uptime: Math.floor((Date.now() - this.serviceState.startTime) / 1000),
          dependencies: {
            postgresql: await this.checkDB(),
            pgvector: await this.checkPgVector(),
            azure_ai_foundry: !!(process.env.AZURE_FOUNDRY_ENDPOINT && process.env.AZURE_API_KEY)
          },
          stats: {
            total_embeddings: this.serviceState.totalEmbeddings,
            last_sync: this.serviceState.lastSync
          }
        };

        const allHealthy = Object.values(health.dependencies).every(v => v);
        health.status = allHealthy && this.serviceState.ready ? 'healthy' : 'degraded';
        res.status(allHealthy ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
      }
    });

    this.app.post('/query', async (req, res) => {
      const startTime = Date.now();
      const { query } = req.body;

      try {
        if (!query || typeof query !== 'string' || query.length > 1000) {
          return res.status(400).json({ success: false, error: 'Query inválido (max 1000 chars)' });
        }

        const { intent, confidence } = await this.classifyIntent(query);
        const parameters = await this.extractQueryParameters(query, intent);
        const results = await this.queryVectorDatabase(query, intent, parameters);
        const markdownResponse = await this.generateMarkdownResponse(query, results, intent);

        const response = {
          success: true,
          data: { markdown: markdownResponse, raw_results: results },
          metadata: {
            intent, confidence, results_count: results.length,
            processing_time_ms: Date.now() - startTime,
            query_parameters: parameters
          }
        };

        await this.logTransaction('NLP_QUERY', query, 'SUCCESS', req, response);
        res.json(response);
      } catch (error) {
        console.error('Error query:', error.message);
        await this.logTransaction('NLP_QUERY', query, 'ERROR', req, null, error.message);
        res.status(500).json({
          success: false,
          error: 'Error procesando consulta',
          details: error.message,
          metadata: { processing_time_ms: Date.now() - startTime }
        });
      }
    });

    this.app.post('/update-embedding', async (req, res) => {
      try {
        const { persona_id } = req.body;
        if (!persona_id) return res.status(400).json({ success: false, error: 'persona_id requerido' });

        const result = await this.pool.query('SELECT * FROM personas_con_edad WHERE id = $1', [persona_id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Persona no encontrada' });

        const persona = result.rows[0];
        const embeddingText = this.buildEmbeddingText(persona);
        const embedding = await this.generateEmbedding(embeddingText);

        await this.pool.query(`
          INSERT INTO personas_embeddings (persona_id, embedding, content_text)
          VALUES ($1, $2, $3)
          ON CONFLICT (persona_id) DO UPDATE SET embedding = EXCLUDED.embedding, content_text = EXCLUDED.content_text, updated_at = CURRENT_TIMESTAMP
        `, [persona.id, pgvector.toSql(embedding), embeddingText]);

        await this.updateServiceStats();
        await this.logTransaction('UPDATE_EMBEDDING', `persona_id: ${persona_id}`, 'SUCCESS', req);

        res.json({ success: true, message: 'Embedding actualizado', persona_id });
      } catch (error) {
        console.error('Error update embedding:', error.message);
        await this.logTransaction('UPDATE_EMBEDDING', req.body, 'ERROR', req, null, error.message);
        res.status(500).json({ success: false, error: 'Error actualizando embedding', details: error.message });
      }
    });

    this.app.post('/sync-embeddings', async (req, res) => {
      try {
        const result = await this.pool.query('SELECT * FROM personas_con_edad ORDER BY id');
        const { successCount, errorCount } = await this.processBatchEmbeddings(result.rows);

        this.serviceState.lastSync = new Date().toISOString();
        await this.updateServiceStats();
        await this.logTransaction('SYNC_EMBEDDINGS', `Total: ${result.rows.length}`, 'SUCCESS', req, { successCount, errorCount });

        res.json({
          success: true,
          message: 'Sincronización completada',
          stats: { total: result.rows.length, success: successCount, errors: errorCount, synced_at: this.serviceState.lastSync }
        });
      } catch (error) {
        console.error('Error sync:', error.message);
        await this.logTransaction('SYNC_EMBEDDINGS', 'bulk', 'ERROR', req, null, error.message);
        res.status(500).json({ success: false, error: 'Error en sincronización', details: error.message });
      }
    });

    this.app.get('/stats', async (req, res) => {
      try {
        const dbStats = await this.pool.query(`
          SELECT COUNT(*) as total_personas, COUNT(CASE WHEN fecha_nacimiento IS NOT NULL THEN 1 END) as personas_con_edad,
          COUNT(CASE WHEN correo_electronico IS NOT NULL THEN 1 END) as personas_con_email, MAX(created_at) as ultima_persona_creada
          FROM personas
        `);
        const embeddingsStats = await this.pool.query(`SELECT COUNT(*) as total_embeddings FROM personas_embeddings`);

        res.json({
          success: true,
          stats: {
            database: {
              total_personas: parseInt(dbStats.rows[0].total_personas),
              personas_con_edad: parseInt(dbStats.rows[0].personas_con_edad),
              personas_con_email: parseInt(dbStats.rows[0].personas_con_email),
              ultima_persona: dbStats.rows[0].ultima_persona_creada
            },
            embeddings: { total_embeddings: parseInt(embeddingsStats.rows[0].total_embeddings), vector_size: 1536, distance_metric: 'cosine' },
            service: {
              version: '2.0.0',
              uptime_seconds: Math.floor((Date.now() - this.serviceState.startTime) / 1000),
              last_sync: this.serviceState.lastSync,
              ready: this.serviceState.ready
            }
          }
        });
      } catch (error) {
        console.error('Error stats:', error.message);
        res.status(500).json({ success: false, error: 'Error obteniendo estadísticas', details: error.message });
      }
    });

    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        endpoints: ['GET /health', 'POST /query', 'POST /update-embedding', 'POST /sync-embeddings', 'GET /stats']
      });
    });

    this.app.use((err, req, res, next) => {
      console.error('Error:', err.message);
      res.status(500).json({ success: false, error: 'Error interno', details: err.message });
    });
  }

  registerService() {
    createServiceRegistryClient({
      serviceId: 'nlp-service-v2',
      name: 'nlp-service',
      host: 'nlp-service',
      port: parseInt(this.PORT),
      protocol: 'http',
      metadata: {
        version: '2.0.0',
        description: 'NLP service with RAG using Azure AI Foundry and pgvector',
        healthEndpoint: '/health',
        tags: ['nlp', 'ai', 'azure', 'pgvector', 'rag'],
        capabilities: ['nlp-query', 'vector-search', 'embeddings', 'semantic-search']
      }
    });
  }

  start() {
    this.app.listen(this.PORT, () => {
      console.log(`🧠 NLP Service v2.0 - Puerto ${this.PORT}`);
      console.log(`Health: http://localhost:${this.PORT}/health`);
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

