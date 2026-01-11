/**
 * NLP Service v3.0 - Text-to-SQL Only
 * Servicio de procesamiento de lenguaje natural usando Text-to-SQL
 * Sin sistema de embeddings vectoriales
 */
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const axios = require("axios");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const {
  createServiceRegistryClient,
  ServiceRegistryClient,
} = require("./shared/service-registry-client");
const SchemaRAG = require("./schema-rag");
const SQLGenerator = require("./sql-generator");
const SQLValidator = require("./sql-validator");

class NLPService {
  constructor() {
    this.app = express();
    this.PORT = process.env.SERVICE_PORT || 3004;

    // Service Registry client para discovery de servicios
    this.discoveryClient = new ServiceRegistryClient({}, process.env.SERVICE_REGISTRY_URL);

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.AZURE_FOUNDRY_ENDPOINT = process.env.AZURE_FOUNDRY_ENDPOINT;
    this.AZURE_CHAT_MODEL = process.env.AZURE_CHAT_MODEL;
    this.AZURE_API_KEY = process.env.AZURE_API_KEY;

    // Configuración del chat adaptada al modelo
    const isGpt51 = this.AZURE_CHAT_MODEL?.includes("gpt-5.1");
    this.chatConfig = {
      temperature: isGpt51 ? 1.0 : 0.7,
      top_p: isGpt51 ? undefined : 0.95,
      max_tokens: 2048,
    };

    this.SYSTEM_PROMPT = this.buildSystemPrompt();
    this.serviceState = {
      ready: false,
      startTime: Date.now(),
    };

    // Text-to-SQL components
    this.schemaRAG = new SchemaRAG(this.pool);
    this.sqlGenerator = null;

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeService();
  }

  buildSystemPrompt() {
    return `Eres un asistente inteligente especializado EXCLUSIVAMENTE en análisis y consultas sobre información de empleados/personas en una base de datos empresarial.

## 🎯 TU FUNCIÓN PRINCIPAL
Analizar, interpretar y responder ÚNICAMENTE preguntas relacionadas con los empleados registrados en la base de datos, utilizando razonamiento, cálculos y análisis basados en los datos disponibles.

## ⛔ RESTRICCIONES ABSOLUTAS
**DEBES RECHAZAR INMEDIATAMENTE cualquier consulta que NO esté directamente relacionada con la gestión de personas/empleados:**

### ❌ NO RESPONDAS a:
- Comparaciones con otros sistemas de IA (ChatGPT, otros modelos, etc.)
- Preguntas generales sobre el mundo, geografía, historia, ciencia
- Matemáticas o cálculos sin contexto de datos de personas
- Preguntas filosóficas, políticas o de opinión
- Solicitudes de entretenimiento (chistes, historias, recomendaciones)
- Conversaciones casuales sin propósito de consulta de datos
- Cualquier tema ajeno a la información de empleados en la base de datos

### ✅ SOLO RESPONDE a:
- Búsquedas, listados y filtros de personas/empleados
- Estadísticas y análisis demográficos de empleados
- Información sobre nombres, apellidos, edades, documentos, géneros
- Consultas sobre contactos (correos, celulares)
- Análisis de fechas de nacimiento, rangos de edad, grupos etarios
- Agregaciones, comparaciones y cálculos sobre datos de personas
- Cualquier operación directamente relacionada con los datos de empleados

**Si recibes una consulta NO relacionada con empleados, responde EXACTAMENTE:**

## Consulta No Válida

Lo siento, soy un asistente especializado exclusivamente en **análisis y consultas sobre información de empleados** en la base de datos.

Solo puedo ayudarte con:
- Búsquedas de personas por nombre, apellido, documento, etc.
- Estadísticas demográficas (edades, géneros, distribuciones)
- Listados y filtros de empleados
- Análisis de datos de personas registradas

**Por favor, reformula tu consulta para que esté relacionada con la gestión de personas.**

## 📊 DATOS DISPONIBLES
La base de datos contiene información de personas con estos campos:
- **Identificación**: número de documento, tipo de documento (Cédula, Tarjeta de identidad)
- **Información personal**: primer nombre, segundo nombre, apellidos, fecha de nacimiento, edad (calculada), género (Masculino, Femenino, No binario, Prefiero no reportar)
- **Contacto**: correo electrónico, celular
- **Clasificación**: grupo de edad (Menor de edad, Adulto, Adulto mayor)
- **Auditoría**: fecha de creación (created_at), fecha de última actualización (updated_at)

## 📝 FORMATO DE RESPUESTAS
Siempre responde en **Markdown formateado profesionalmente** con tablas, listas y métricas en negritas.`;
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        console.log(
          `${req.method} ${req.path} - ${res.statusCode} - ${Date.now() - start}ms`
        );
      });
      next();
    });
  }

  /**
   * Security validation for queries
   */
  checkSecurityRisks(query) {
    const queryLower = query.toLowerCase();

    const dangerousKeywords = [
      "password", "contraseña", "passwd",
      "drop table", "drop database", "delete from", "truncate",
      "update personas", "update usuarios", "update users",
      "insert into", "alter table", "create table",
      "grant", "revoke", "exec", "execute",
      "script", "<script", "javascript:", "onerror=", "onload=",
      "--", "/*", "*/", "xp_", "sp_", "0x", "char(",
      "union select", "union all select",
    ];

    for (const keyword of dangerousKeywords) {
      if (queryLower.includes(keyword)) {
        return {
          isDangerous: true,
          reason: `Palabra clave no permitida: "${keyword}"`,
        };
      }
    }

    const sqlInjectionPatterns = [
      /;\s*(drop|delete|truncate|update|insert|alter|create)\s+/i,
      /'\s*or\s*'1'\s*=\s*'1/i,
      /'\s*or\s*1\s*=\s*1/i,
      /'\s*;\s*--/i,
      /\/\*.*\*\//i,
    ];

    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(query)) {
        return {
          isDangerous: true,
          reason: "Patrón de SQL injection detectado",
        };
      }
    }

    return { isDangerous: false };
  }

  /**
   * Detecta si una consulta corresponde a un tipo predefinido
   */
  detectPredefinedQuery(query) {
    const queryLower = query.toLowerCase();

    const patterns = {
      stats_personas: [
        /estad[íi]sticas?\s*(de\s*)?(las\s*)?(personas?)?/i,
        /cu[aá]ntas?\s+personas?\s+hay/i,
        /total\s+de\s+personas/i,
        /resumen\s+(de\s+)?personas/i,
      ],
      stats_edad: [
        /distribuci[oó]n\s+(por\s+)?edad/i,
        /grupos?\s+(de\s+)?edad/i,
        /estad[íi]sticas?\s+(por\s+)?edad/i,
        /menores?|adultos?|mayores?/i,
      ],
      buscar_documento: [
        /busca(r)?\s+(por\s+)?(documento|c[eé]dula|n[uú]mero)/i,
        /documento\s+\d{8,10}/i,
        /persona\s+con\s+documento/i,
      ],
      ultimos_registros: [
        /[uú]ltim[oa]s?\s+(personas?|registros?)/i,
        /recientes?/i,
        /nuevos?\s+registros?/i,
      ],
      logs_recientes: [
        /logs?\s+recientes?/i,
        /transacciones?\s+recientes?/i,
        /historial\s+de\s+(transacciones?|operaciones?)/i,
        /auditor[ií]a/i,
      ],
      usuarios_activos: [
        /usuarios?\s+(activos?|registrados?)/i,
        /lista\s+(de\s+)?usuarios?/i,
        /qui[eé]nes?\s+tiene?n?\s+cuenta/i,
      ],
    };

    for (const [type, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        if (pattern.test(queryLower)) {
          return type;
        }
      }
    }

    return null;
  }

  /**
   * Formatea la respuesta SQL usando LLM
   */
  async formatSQLResponse(originalQuery, results, explanation) {
    if (!results || results.length === 0) {
      return "No se encontraron resultados para tu consulta.";
    }

    if (results.length <= 5) {
      const userPrompt = `El usuario preguntó: "${originalQuery}"

Resultados de la base de datos (${results.length} registros):
${JSON.stringify(results, null, 2)}

Genera una respuesta amigable en español que resuma los resultados. 
Si hay datos de personas, muestra nombre, documento y datos relevantes.
Usa formato markdown con listas o tablas según corresponda.`;

      try {
        return await this.chatWithAzure(userPrompt);
      } catch (error) {
        return this.formatResultsSimple(results);
      }
    }

    const summary = this.summarizeResults(results);
    const userPrompt = `El usuario preguntó: "${originalQuery}"

Resumen de ${results.length} resultados:
${JSON.stringify(summary, null, 2)}

Genera una respuesta amigable en español que resuma los hallazgos principales.
Usa formato markdown con viñetas para los puntos clave.`;

    try {
      return await this.chatWithAzure(userPrompt);
    } catch (error) {
      return this.formatResultsSimple(results.slice(0, 10));
    }
  }

  summarizeResults(results) {
    const summary = {
      total: results.length,
      sample: results.slice(0, 3),
      columns: results.length > 0 ? Object.keys(results[0]) : [],
    };

    if (results.length > 0) {
      const numericFields = Object.keys(results[0]).filter(
        (k) => typeof results[0][k] === "number"
      );
      for (const field of numericFields) {
        const values = results.map((r) => r[field]).filter((v) => v != null);
        if (values.length > 0) {
          summary[`${field}_min`] = Math.min(...values);
          summary[`${field}_max`] = Math.max(...values);
          summary[`${field}_avg`] = (
            values.reduce((a, b) => a + b, 0) / values.length
          ).toFixed(2);
        }
      }
    }

    return summary;
  }

  formatResultsSimple(results) {
    if (!results || results.length === 0) {
      return "No se encontraron resultados.";
    }

    let markdown = `Se encontraron **${results.length}** resultados:\n\n`;

    for (const row of results.slice(0, 10)) {
      if (row.primer_nombre || row.numero_documento) {
        markdown += `- **${row.primer_nombre || ""} ${row.apellidos || ""}** `;
        markdown += `(Doc: ${row.numero_documento || "N/A"})`;
        if (row.edad) markdown += ` - ${row.edad} años`;
        markdown += "\n";
      } else {
        markdown += `- ${JSON.stringify(row)}\n`;
      }
    }

    if (results.length > 10) {
      markdown += `\n... y ${results.length - 10} más.`;
    }

    return markdown;
  }

  async initializeService() {
    try {
      console.log("🚀 Iniciando NLP Service v3.0 (Text-to-SQL only)...");
      const client = await this.pool.connect();
      try {
        await client.query("SELECT NOW()");
      } finally {
        client.release();
      }

      // Inicializar Text-to-SQL components
      const azureClient = {
        chat: async ({ messages, temperature, max_tokens }) => {
          return await this.chatWithAzure(messages[1].content, messages[0].content, { temperature, max_tokens });
        }
      };
      this.sqlGenerator = new SQLGenerator(this.schemaRAG, azureClient, this.pool);
      console.log("✅ Text-to-SQL inicializado");

      this.serviceState.ready = true;
      console.log("✅ Servicio inicializado");
      this.registerService();
    } catch (error) {
      console.error("❌ Error inicializando:", error.message);
      this.serviceState.ready = false;
    }
  }

  async logTransaction(type, query, status, req, responseData = null, error = null) {
    try {
      let logServiceUrl;
      try {
        logServiceUrl = await this.discoveryClient.getServiceUrl('log-service');
      } catch {
        console.warn('⚠️ Service discovery failed for log-service, using fallback');
        logServiceUrl = process.env.LOG_SERVICE_URL || "http://log-service:3005";
      }
      await axios.post(
        `${logServiceUrl}/log`,
        {
          transaction_type: type,
          entity_type: "NLP_QUERY_V3",
          user_id: req.headers["x-user-id"],
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.headers["user-agent"],
          request_data: { query, timestamp: new Date().toISOString() },
          response_data: responseData
            ? {
                results_count: responseData.results_count,
                processing_time: responseData.processing_time_ms,
              }
            : null,
          status,
          error_message: error,
        },
        { timeout: 5000 }
      );
    } catch (logError) {
      console.error("Error log:", logError.message);
    }
  }

  async callAzureAI({ systemMessage, userMessage, temperature = this.chatConfig.temperature, maxTokens = this.chatConfig.max_tokens, topP = this.chatConfig.top_p, timeout = 30000 }) {
    const payload = {
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      max_completion_tokens: maxTokens,
    };

    if (!this.AZURE_CHAT_MODEL.includes("gpt-5.1") || temperature === 1.0) {
      payload.temperature = temperature;
    }

    if (!this.AZURE_CHAT_MODEL.includes("gpt-5.1")) {
      payload.top_p = topP;
    }

    const response = await axios.post(
      `${this.AZURE_FOUNDRY_ENDPOINT}/openai/deployments/${this.AZURE_CHAT_MODEL}/chat/completions?api-version=2024-08-01-preview`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": this.AZURE_API_KEY,
        },
        timeout,
      }
    );
    return response.data.choices?.[0]?.message?.content?.trim() || "";
  }

  async chatWithAzure(userMessage, systemMessage = this.SYSTEM_PROMPT, options = {}) {
    return this.callAzureAI({
      systemMessage,
      userMessage,
      ...options,
    });
  }

  async checkDB() {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  setupRoutes() {
    // Health check
    this.app.get("/health", async (req, res) => {
      try {
        const health = {
          status: this.serviceState.ready ? "healthy" : "starting",
          service: "nlp-service-v3",
          version: "3.0.0",
          mode: "text-to-sql",
          uptime: Math.floor((Date.now() - this.serviceState.startTime) / 1000),
          dependencies: {
            postgresql: await this.checkDB(),
            azure_ai_foundry: !!(this.AZURE_FOUNDRY_ENDPOINT && this.AZURE_API_KEY),
          },
        };
        const allHealthy = Object.values(health.dependencies).every(Boolean);
        health.status = allHealthy && this.serviceState.ready ? "healthy" : "degraded";
        res.status(allHealthy ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({ status: "unhealthy", error: error.message });
      }
    });

    // Main query endpoint - Text-to-SQL
    this.app.post("/query", async (req, res) => {
      const startTime = Date.now();
      const { query, options = {} } = req.body;

      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Se requiere una consulta válida",
        });
      }

      if (query.length > 2000) {
        return res.status(400).json({
          success: false,
          error: "Query inválido (max 2000 chars)",
        });
      }

      try {
        const securityCheck = this.checkSecurityRisks(query);
        if (securityCheck.isDangerous) {
          return res.status(400).json({
            success: false,
            error: "Consulta rechazada por seguridad",
            reason: securityCheck.reason,
          });
        }

        const predefinedType = this.detectPredefinedQuery(query);
        let sqlResult;

        if (predefinedType && this.sqlGenerator) {
          sqlResult = this.sqlGenerator.getPredefinedQuery(predefinedType, {
            limit: options.limit || 100,
            documento: options.documento,
          });
        }

        if (!sqlResult && this.sqlGenerator) {
          sqlResult = await this.sqlGenerator.generateSQL(query, options);
        }

        if (!sqlResult) {
          throw new Error("SQL Generator no inicializado");
        }

        const result = await this.pool.query(sqlResult.sql, sqlResult.params);

        let formattedResponse = null;
        if (result.rows.length > 0) {
          formattedResponse = await this.formatSQLResponse(query, result.rows, sqlResult.explanation);
        } else {
          formattedResponse = "No se encontraron resultados para tu consulta.";
        }

        const processingTime = Date.now() - startTime;

        await this.logTransaction("SQL_QUERY", query, "SUCCESS", req, {
          sql: sqlResult.sql,
          results_count: result.rows.length,
          processing_time_ms: processingTime,
        });

        res.json({
          success: true,
          data: {
            markdown: formattedResponse,
            raw_results: result.rows,
            count: result.rows.length,
          },
          metadata: {
            sql_generated: sqlResult.sql,
            params: sqlResult.params,
            explanation: sqlResult.explanation,
            tables_used: sqlResult.tables_used || [],
            predefined: sqlResult.predefined || false,
            processing_time_ms: processingTime,
            validation: sqlResult.validation,
          },
        });
      } catch (error) {
        console.error("Error en query:", error);
        await this.logTransaction("SQL_QUERY", query, "ERROR", req, null, error.message);
        res.status(500).json({
          success: false,
          error: "Error procesando consulta",
          details: error.message,
        });
      }
    });

    // Schema endpoint
    this.app.get("/schema", async (req, res) => {
      try {
        const schema = await this.schemaRAG.getSchema();
        res.json({
          success: true,
          schema: {
            tables: Object.keys(schema.tables).map((name) => ({
              name,
              columns: schema.tables[name].columns.length,
              isView: schema.tables[name].isView,
            })),
            relationships: schema.relationships.length,
            lastUpdated: schema.lastUpdated,
          },
        });
      } catch (error) {
        console.error("Error obteniendo schema:", error);
        res.status(500).json({
          success: false,
          error: "Error obteniendo esquema",
          details: error.message,
        });
      }
    });

    // Schema table detail
    this.app.get("/schema/:table", async (req, res) => {
      try {
        const { table } = req.params;
        const schema = await this.schemaRAG.getSchema();

        if (!schema.tables[table]) {
          return res.status(404).json({
            success: false,
            error: `Tabla '${table}' no encontrada`,
          });
        }

        res.json({
          success: true,
          table: schema.tables[table],
        });
      } catch (error) {
        console.error("Error obteniendo tabla:", error);
        res.status(500).json({
          success: false,
          error: "Error obteniendo información de tabla",
          details: error.message,
        });
      }
    });

    // Validate SQL endpoint
    this.app.post("/validate-sql", async (req, res) => {
      try {
        const { sql } = req.body;

        if (!sql) {
          return res.status(400).json({
            success: false,
            error: "Se requiere una consulta SQL",
          });
        }

        const validator = new SQLValidator(this.pool);
        const validation = await validator.validate(sql);

        res.json({
          success: true,
          validation,
        });
      } catch (error) {
        console.error("Error validando SQL:", error);
        res.status(500).json({
          success: false,
          error: "Error validando SQL",
          details: error.message,
        });
      }
    });

    // Stats endpoint
    this.app.get("/stats", async (req, res) => {
      try {
        const dbStats = await this.pool.query(`
          SELECT COUNT(*) as total_personas,
                 COUNT(CASE WHEN fecha_nacimiento IS NOT NULL THEN 1 END) as personas_con_edad,
                 COUNT(CASE WHEN correo_electronico IS NOT NULL THEN 1 END) as personas_con_email,
                 MAX(created_at) as ultima_persona_creada
          FROM personas`);

        const usersStats = await this.pool.query(`SELECT COUNT(*) as total_users FROM users`);
        const logsStats = await this.pool.query(`SELECT COUNT(*) as total_logs FROM transaction_logs`);

        res.json({
          success: true,
          stats: {
            database: {
              total_personas: parseInt(dbStats.rows[0].total_personas),
              personas_con_edad: parseInt(dbStats.rows[0].personas_con_edad),
              personas_con_email: parseInt(dbStats.rows[0].personas_con_email),
              ultima_persona: dbStats.rows[0].ultima_persona_creada,
              total_users: parseInt(usersStats.rows[0].total_users),
              total_logs: parseInt(logsStats.rows[0].total_logs),
            },
            service: {
              version: "3.0.0",
              mode: "text-to-sql",
              uptime_seconds: Math.floor((Date.now() - this.serviceState.startTime) / 1000),
              ready: this.serviceState.ready,
            },
          },
        });
      } catch (error) {
        console.error("Error stats:", error);
        res.status(500).json({
          success: false,
          error: "Error obteniendo estadísticas",
          details: error.message,
        });
      }
    });

    // 404 Handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: "Ruta no encontrada",
        endpoints: [
          "GET /health",
          "POST /query - Consulta Text-to-SQL",
          "GET /schema - Esquema de la BD",
          "GET /schema/:table - Detalles de una tabla",
          "POST /validate-sql - Validar SQL",
          "GET /stats - Estadísticas",
        ],
      });
    });

    this.app.use((err, req, res, next) => {
      console.error("Error:", err.message);
      res.status(500).json({ success: false, error: "Error interno", details: err.message });
    });
  }

  registerService() {
    createServiceRegistryClient({
      serviceId: "nlp-service-v3",
      name: "nlp-service",
      host: "nlp-service",
      port: parseInt(this.PORT),
      protocol: "http",
      metadata: {
        version: "3.0.0",
        description: "NLP service with Text-to-SQL using Azure AI Foundry",
        healthEndpoint: "/health",
        tags: ["nlp", "ai", "azure", "text-to-sql"],
        capabilities: ["nlp-query", "text-to-sql", "schema-analysis"],
      },
    });
  }

  start() {
    this.app.listen(this.PORT, () => {
      console.log(`🧠 NLP Service v3.0 (Text-to-SQL) - Puerto ${this.PORT}`);
      console.log(`Health: http://localhost:${this.PORT}/health`);
    });
  }
}

// Iniciar servicio
const nlpService = new NLPService();
nlpService.start();

// Manejo de cierre graceful
process.on("SIGTERM", async () => {
  console.log("\n🔄 Cerrando servicio...");
  await nlpService.pool.end();
  process.exit(0);
});
