// Cleaned version without duplicated/redeclared blocks.
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const pgvector = require("pgvector/pg");
const axios = require("axios");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const {
  createServiceRegistryClient,
} = require("./shared/service-registry-client");

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

    // Configuración del chat adaptada al modelo
    // gpt-5.1-chat solo acepta temperature=1.0
    const isGpt51 = this.AZURE_CHAT_MODEL?.includes("gpt-5.1");
    this.chatConfig = {
      temperature: isGpt51 ? 1.0 : 0.7,
      top_p: isGpt51 ? undefined : 0.95,
      max_tokens: 2048,
    };
    this.VECTOR_SIZE = 1536;

    this.SYSTEM_PROMPT = this.buildSystemPrompt();
    this.serviceState = {
      ready: false,
      lastSync: null,
      totalEmbeddings: 0,
      startTime: Date.now(),
    };

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

## ✅ CAPACIDADES (solo para consultas válidas sobre empleados)
Puedes realizar CUALQUIER análisis o consulta sobre los empleados:
- Búsquedas simples y complejas por cualquier campo
- Estadísticas descriptivas (promedios, medianas, modas, desviaciones)
- Análisis demográficos y distribuciones
- Comparaciones y relaciones entre grupos
- Cálculos personalizados basados en los datos
- Análisis de tendencias y patrones
- Agregaciones complejas y segmentaciones
- Respuestas a preguntas hipotéticas basadas en datos reales
- Insights y conclusiones basadas en evidencia

## 🧠 METODOLOGÍA DE ANÁLISIS
1. **Examina los datos**: Revisa TODA la información disponible en los resultados
2. **Razona**: Aplica lógica y matemáticas según la pregunta
3. **Calcula**: Realiza todas las operaciones necesarias (sumas, promedios, porcentajes, etc.)
4. **Interpreta**: Extrae insights y conclusiones significativas
5. **Presenta**: Formatea en Markdown profesional y claro

## 📝 FORMATO DE RESPUESTAS
Siempre responde en **Markdown formateado profesionalmente**:

### Para Listados de Personas:
- Usa **tablas Markdown** con columnas que consideres relevantes según la consulta del usuario

## Resultados de Búsqueda (15 personas)

| Nombre | Edad | Género | Documento |
|--------|------|--------|-----------|
| Juan Pérez García | 34 | Masculino | 12345678 |
| María López Silva | 28 | Femenino | 45435490 |

### Para Análisis y Estadísticas:
Usa títulos, listas, tablas y métricas en negritas:

## Análisis Demográfico

**Métricas Clave:**
- Total de personas: **150**
- Edad promedio: **34.5 años**
- Desviación estándar: **8.2 años**

### Distribución por Género

| Género | Cantidad | Porcentaje |
|--------|----------|------------|
| Masculino | 75 | 50.0% |
| Femenino | 70 | 46.7% |

**Conclusión:** La distribución de género es equilibrada...

## 🎨 ESTILO
- Profesional, claro y conciso
- Sin emojis (mantén tono formal)
- Usa números exactos y precisos
- Incluye interpretaciones y conclusiones cuando sea relevante
- Organiza con títulos y secciones

**RECUERDA:** Solo respondes consultas sobre empleados/personas en la base de datos. Cualquier otra pregunta debe ser rechazada cortésmente.`;
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
          `${req.method} ${req.path} - ${res.statusCode} - ${
            Date.now() - start
          }ms`
        );
      });
      next();
    });
  }

  /**
   * Security validation for queries (CU-08: Security Risk Detection)
   * Detects dangerous keywords and SQL injection attempts
   */
  checkSecurityRisks(query) {
    const queryLower = query.toLowerCase();

    // Lista de palabras clave peligrosas
    const dangerousKeywords = [
      "password",
      "contraseña",
      "passwd",
      "drop table",
      "drop database",
      "delete from",
      "truncate",
      "update personas",
      "update usuarios",
      "update users",
      "insert into",
      "alter table",
      "create table",
      "grant",
      "revoke",
      "exec",
      "execute",
      "script",
      "<script",
      "javascript:",
      "onerror=",
      "onload=",
      "--",
      "/*",
      "*/",
      "xp_",
      "sp_",
      "0x",
      "char(",
      "union select",
      "union all select",
    ];

    for (const keyword of dangerousKeywords) {
      if (queryLower.includes(keyword)) {
        return {
          isDangerous: true,
          reason: `Palabra clave no permitida: "${keyword}"`,
        };
      }
    }

    // Detectar patrones de SQL injection
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

  async initializeService() {
    try {
      console.log("🚀 Iniciando NLP Service v2.0...");
      const client = await this.pool.connect();
      try {
        await client.query("SELECT NOW()");
        await pgvector.registerType(client);
      } finally {
        client.release();
      }
      await this.verifyPgvectorExtension();
      await this.updateServiceStats();
      await this.autoSyncEmbeddings();
      this.serviceState.ready = true;
      console.log("✅ Servicio inicializado");
      this.registerService();
    } catch (error) {
      console.error("❌ Error inicializando:", error.message);
      this.serviceState.ready = false;
    }
  }

  async verifyPgvectorExtension() {
    const extensionCheck = await this.pool.query(
      `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists`
    );
    if (!extensionCheck.rows[0].exists) {
      try {
        await this.pool.query("CREATE EXTENSION IF NOT EXISTS vector");
        console.log("✅ pgvector instalado automáticamente");
      } catch (e) {
        throw new Error("pgvector no instalado");
      }
    }
    const tableCheck = await this.pool.query(
      `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'personas_embeddings') as exists`
    );
    if (!tableCheck.rows[0].exists) {
      console.log("⚠️ Tabla personas_embeddings no existe");
    }
  }

  async updateServiceStats() {
    try {
      const result = await this.pool.query(
        "SELECT COUNT(*) as total FROM personas_embeddings"
      );
      this.serviceState.totalEmbeddings = parseInt(result.rows[0].total) || 0;
    } catch (error) {
      console.error("Error actualizando stats:", error.message);
    }
  }

  async autoSyncEmbeddings() {
    try {
      const dbResult = await this.pool.query(
        "SELECT COUNT(*) as total FROM personas_con_edad"
      );
      const embeddingsResult = await this.pool.query(
        "SELECT COUNT(*) as total FROM personas_embeddings"
      );
      const totalPersonasDB = parseInt(dbResult.rows[0].total) || 0;
      const totalEmbeddings = parseInt(embeddingsResult.rows[0].total) || 0;
      console.log(
        `DB: ${totalPersonasDB} personas | Vector: ${totalEmbeddings} embeddings`
      );
      if (totalPersonasDB === totalEmbeddings) {
        console.log("✅ Sincronizado");
        this.serviceState.lastSync = new Date().toISOString();
        return;
      }
      console.log("🔄 Sincronizando...");
      const result = await this.pool.query(`
        SELECT p.* FROM personas_con_edad p
        LEFT JOIN personas_embeddings pe ON p.id = pe.persona_id
        WHERE pe.id IS NULL ORDER BY p.id
      `);
      const { successCount, errorCount } = await this.processBatchEmbeddings(
        result.rows
      );
      this.serviceState.lastSync = new Date().toISOString();
      await this.updateServiceStats();
      console.log(`✅ Sync: ${successCount} éxitos, ${errorCount} errores`);
    } catch (error) {
      console.error("Error sync:", error.message);
    }
  }

  async processBatchEmbeddings(personas, batchSize = 10) {
    let successCount = 0;
    let errorCount = 0;
    for (let i = 0; i < personas.length; i += batchSize) {
      const batch = personas.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (persona) => {
          try {
            const embeddingText = this.buildEmbeddingText(persona);
            const embedding = await this.generateEmbedding(embeddingText);
            await this.pool.query(
              `INSERT INTO personas_embeddings (persona_id, numero_documento, embedding, content_text)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (persona_id) DO UPDATE SET numero_documento = EXCLUDED.numero_documento, embedding = EXCLUDED.embedding, content_text = EXCLUDED.content_text, updated_at = CURRENT_TIMESTAMP`,
              [
                persona.id,
                persona.numero_documento,
                pgvector.toSql(embedding),
                embeddingText,
              ]
            );
            successCount++;
          } catch (error) {
            console.error(`Error persona ${persona.id}:`, error.message);
            errorCount++;
          }
        })
      );
      await new Promise((r) => setTimeout(r, 300));
    }
    return { successCount, errorCount };
  }

  buildEmbeddingText(persona) {
    return `${persona.primer_nombre} ${persona.segundo_nombre || ""} ${
      persona.apellidos
    } ${persona.tipo_documento} ${persona.numero_documento} ${
      persona.genero
    } edad ${persona.edad} años ${persona.grupo_edad || ""} ${
      persona.correo_electronico
    } ${persona.celular} nacimiento ${persona.fecha_nacimiento || ""}`.trim();
  }

  async logTransaction(
    type,
    query,
    status,
    req,
    responseData = null,
    error = null
  ) {
    try {
      const logServiceUrl =
        process.env.LOG_SERVICE_URL || "http://log-service:3005";
      await axios.post(
        `${logServiceUrl}/log`,
        {
          transaction_type: type,
          entity_type: "NLP_QUERY_V2",
          user_id: req.headers["x-user-id"],
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.headers["user-agent"],
          request_data: { query, timestamp: new Date().toISOString() },
          response_data: responseData
            ? {
                intent: responseData.metadata?.intent,
                results_count: responseData.metadata?.results_count,
                processing_time: responseData.metadata?.processing_time_ms,
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

  async callAzureAI({
    systemMessage,
    userMessage,
    temperature = this.chatConfig.temperature,
    maxTokens = this.chatConfig.max_tokens,
    topP = this.chatConfig.top_p,
    timeout = 30000,
  }) {
    // gpt-5.1-chat solo acepta temperature=1.0 (valor por defecto)
    // Construir payload según las restricciones del modelo
    const payload = {
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      max_completion_tokens: maxTokens,
    };

    // Solo agregar temperature si NO es gpt-5.1-chat o si es exactamente 1.0
    if (!this.AZURE_CHAT_MODEL.includes("gpt-5.1") || temperature === 1.0) {
      payload.temperature = temperature;
    }

    // Solo agregar top_p si el modelo lo soporta
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

  async generateEmbedding(text) {
    const response = await axios.post(
      `${this.AZURE_FOUNDRY_ENDPOINT}/openai/deployments/${this.AZURE_EMBEDDING_MODEL}/embeddings?api-version=2023-05-15`,
      { model: this.AZURE_EMBEDDING_MODEL, input: text },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": this.AZURE_API_KEY,
        },
        timeout: 30000,
      }
    );
    return response.data.data[0].embedding;
  }

  async extractQueryParameters(query) {
    const prompt = `Analiza profundamente la consulta del usuario y extrae parámetros de filtrado, ordenamiento y límite optimizados.

**CONSULTA:** "${query}"

## ANÁLISIS CONTEXTUAL

**Lee la consulta completa** e identifica:
1. **Intención**: ¿Busca registros específicos, valores extremos, o cálculos agregados?
2. **Restricciones explícitas**: Filtros mencionados directamente (edad, género, nombres, fechas)
3. **Restricciones implícitas**: Contexto que sugiere filtrado (ej: "adultos" → grupo_edad, "recién registrados" → created_at reciente)
4. **Criterio de ordenamiento**: ¿Qué campo determina el resultado? (edad, nombre, fecha)
5. **Cantidad esperada**: ¿Cuántos resultados necesita? (1, varios, todos)

## PARÁMETROS DISPONIBLES

**Identificación:**
- numero_documento, tipo_documento ("Cédula", "Tarjeta de identidad")

**Nombres (con patrones):**
- primer_nombre, segundo_nombre, apellidos → Usa % para patrones: "Gó%" (empieza), "%or" (termina), "%rod%" (contiene)
- nombre → Búsqueda general en todos los campos de nombre

**Datos personales:**
- edad_min, edad_max → Valores numéricos
- genero → "Masculino", "Femenino", "No binario", "Prefiero no reportar"
- grupo_edad → "Menor de edad", "Adulto", "Adulto mayor"
- fecha_nacimiento_min, fecha_nacimiento_max → YYYY-MM-DD

**Contacto:**
- correo_electronico, celular → Soportan patrones %

**Auditoría:**
- created_at_min, created_at_max → YYYY-MM-DD o YYYY-MM-DD HH:MM:SS
- updated_at_min, updated_at_max → YYYY-MM-DD o YYYY-MM-DD HH:MM:SS

**Control de consulta:**
- limit → 1-200 (ajusta según necesidad)
- sort_by → "similarity", "edad_desc", "edad_asc", "nombre", "fecha_nacimiento_desc", "fecha_nacimiento_asc", "created_at_desc"
- query_type → "analytical", "filtered", "semantic"

## ESTRATEGIAS DE OPTIMIZACIÓN

### 1. SUPERLATIVOS (valores extremos)
**Patrones:** "más/menos X", "mayor/menor", "top N", "primeros/últimos N", "ranking"
**Estrategia:** Ordenamiento + limit pequeño
**Aplicar:**
- Identifica el campo de comparación (edad, fecha_nacimiento, created_at)
- Determina dirección: DESC (más/mayor/primeros) o ASC (menos/menor/últimos)
- limit = N mencionado o 1 si no especifica
- Permite filtros de otros campos si son explícitos (o implícitos contextuales)

**Ejemplos:**
- "el más viejo" → limit=1, sort_by="edad_desc", query_type="analytical"
- "top 5 jóvenes" → limit=5, sort_by="edad_asc", query_type="analytical"
- "último adulto registrado" → grupo_edad="Adulto", limit=1, sort_by="created_at_desc", query_type="analytical"

### 2. AGREGACIONES (cálculos estadísticos)
**Patrones:** "promedio", "media", "total", "cuántos", "distribución", "porcentaje"
**Estrategia:** Sin filtros restrictivos + limit alto
**Aplicar:**
- limit=200 (necesita todos los datos)
- sort_by="similarity" (orden no crítico)
- query_type="analytical"
- NO agregues filtros a menos que sean MUY explícitos

**Ejemplos:**
- "promedio de edad" → limit=200, sort_by="similarity"
- "cuántos empleados" → limit=200, sort_by="similarity"
- "distribución de adultos por género" → grupo_edad="Adulto", limit=200

### 3. FILTRADO ESPECÍFICO (búsquedas con criterios)
**Patrones:** Menciones directas de valores, rangos, categorías, patrones
**Estrategia:** Filtros explícitos + ordenamiento relevante + limit moderado
**Aplicar:**
- Extrae TODOS los filtros mencionados (explícitos e implícitos contextuales)
- limit=50-100 (cantidad esperada moderada, ajusta según contexto)
- sort_by="nombre" (alfabético) o "similarity" (relevancia)
- query_type="filtered"

**Filtros explícitos:** "mayores de 30", "mujeres", "apellido Rodríguez"
**Filtros implícitos contextuales:**
- "adultos" → grupo_edad="Adulto"
- "cédulas" → tipo_documento="Cédula"
- "registrados este año" → created_at_min=2025-01-01
- "terminan en García" → apellidos="%García"

**Ejemplos:**
- "mujeres adultas mayores de 40" → genero="Femenino", grupo_edad="Adulto", edad_min=40, limit=100
- "adultos con gmail" → grupo_edad="Adulto", correo_electronico="%gmail%", limit=100
- "hombres apellido empieza con Ro" → genero="Masculino", apellidos="Ro%", limit=100

### 4. BÚSQUEDAS SEMÁNTICAS (vagas o conceptuales)
**Patrones:** Preguntas sin filtros claros, búsquedas generales
**Estrategia:** Sin filtros + ordenamiento por similitud + limit moderado
**Aplicar:**
- limit=50-100 (según vaguedad)
- sort_by="similarity"
- query_type="semantic"

**Ejemplos:**
- "personas relacionadas con tecnología" → limit=50, sort_by="similarity"
- "empleados del área" → limit=100, sort_by="similarity"

## REGLAS DE EXTRACCIÓN

1. **Prioriza contexto sobre literalidad:** Si dice "adultos", aplica grupo_edad="Adulto" aunque no diga explícitamente "grupo_edad adulto"

2. **Combina filtros inteligentemente:** Permite superlativos con filtros de otros campos: "hombre más viejo" = genero + sort_by edad

3. **Patrones de nombres:** Detecta intención:
   - "termina/acaba/finaliza con X" → "%X"
   - "empieza/inicia/comienza con X" → "X%"
   - "contiene/incluye X" → "%X%"
   - Nombre exacto sin indicadores → "%X%"

4. **Interpreta rangos implícitos:**
   - "treintañeros" → edad_min=30, edad_max=39
   - "mayores de edad" → edad_min=18
   - "ancianos/tercera edad" → grupo_edad="Adulto mayor"


## FORMATO DE RESPUESTA

Responde SOLO con JSON válido (sin markdown ni comentarios):
{
  "numero_documento":null,
  "tipo_documento":null,
  "primer_nombre":null,
  "segundo_nombre":null,
  "apellidos":null,
  "nombre":null,
  "fecha_nacimiento_min":null,
  "fecha_nacimiento_max":null,
  "edad_min":null,
  "edad_max":null,
  "genero":null,
  "correo_electronico":null,
  "celular":null,
  "grupo_edad":null,
  "created_at_min":null,
  "created_at_max":null,
  "updated_at_min":null,
  "updated_at_max":null,
  "limit":100,
  "sort_by":"similarity",
  "query_type":"semantic"
}

**Valida antes de responder:** ¿Los parámetros reflejan fielmente la intención del usuario? ¿El limit es apropiado? ¿El ordenamiento es óptimo?`;

    try {
      let text = await this.callAzureAI({
        systemMessage:
          "Eres un extractor de parámetros preciso. Responde solo con JSON válido.",
        userMessage: prompt,
        temperature: 1.0, // Usar temperatura fija para gpt-5.1
        maxTokens: 400,
      });
      text = (text || "{}")
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const params = JSON.parse(text);
      const validSortBy = [
        "similarity",
        "edad_desc",
        "edad_asc",
        "nombre",
        "fecha_nacimiento_desc",
        "fecha_nacimiento_asc",
        "created_at_desc",
      ];
      const validQueryType = ["analytical", "filtered", "semantic"];

      return {
        numero_documento: params.numero_documento || null,
        tipo_documento: ["Cédula", "Tarjeta de identidad"].includes(
          params.tipo_documento
        )
          ? params.tipo_documento
          : null,
        primer_nombre: params.primer_nombre || null,
        segundo_nombre: params.segundo_nombre || null,
        apellidos: params.apellidos || null,
        nombre: params.nombre || null,
        fecha_nacimiento_min: params.fecha_nacimiento_min || null,
        fecha_nacimiento_max: params.fecha_nacimiento_max || null,
        edad_min:
          params.edad_min && !isNaN(params.edad_min)
            ? parseInt(params.edad_min)
            : null,
        edad_max:
          params.edad_max && !isNaN(params.edad_max)
            ? parseInt(params.edad_max)
            : null,
        genero: [
          "Masculino",
          "Femenino",
          "No binario",
          "Prefiero no reportar",
        ].includes(params.genero)
          ? params.genero
          : null,
        correo_electronico: params.correo_electronico || null,
        celular: params.celular || null,
        grupo_edad: ["Menor de edad", "Adulto", "Adulto mayor"].includes(
          params.grupo_edad
        )
          ? params.grupo_edad
          : null,
        created_at_min: params.created_at_min || null,
        created_at_max: params.created_at_max || null,
        updated_at_min: params.updated_at_min || null,
        updated_at_max: params.updated_at_max || null,
        limit:
          params.limit && !isNaN(params.limit)
            ? Math.min(Math.max(parseInt(params.limit), 10), 200)
            : 100,
        sort_by: validSortBy.includes(params.sort_by)
          ? params.sort_by
          : "similarity",
        query_type: validQueryType.includes(params.query_type)
          ? params.query_type
          : "semantic",
      };
    } catch (error) {
      console.error("Error extracción params:", error.message);
      return {
        numero_documento: null,
        tipo_documento: null,
        primer_nombre: null,
        segundo_nombre: null,
        apellidos: null,
        nombre: null,
        fecha_nacimiento_min: null,
        fecha_nacimiento_max: null,
        edad_min: null,
        edad_max: null,
        genero: null,
        correo_electronico: null,
        celular: null,
        grupo_edad: null,
        created_at_min: null,
        created_at_max: null,
        updated_at_min: null,
        updated_at_max: null,
        limit: 100,
        sort_by: "similarity",
        query_type: "semantic",
      };
    }
  }

  buildOrderByClause(sortBy, similarityParamIndex) {
    const orderByMap = {
      similarity: `pe.embedding <=> $${similarityParamIndex}`,
      edad_desc: `edad DESC, pe.embedding <=> $${similarityParamIndex}`,
      edad_asc: `edad ASC, pe.embedding <=> $${similarityParamIndex}`,
      nombre: `p.apellidos ASC, p.primer_nombre ASC, pe.embedding <=> $${similarityParamIndex}`,
      fecha_nacimiento_desc: `p.fecha_nacimiento DESC, pe.embedding <=> $${similarityParamIndex}`,
      fecha_nacimiento_asc: `p.fecha_nacimiento ASC, pe.embedding <=> $${similarityParamIndex}`,
      created_at_desc: `p.created_at DESC, pe.embedding <=> $${similarityParamIndex}`,
    };
    return orderByMap[sortBy] || orderByMap.similarity;
  }

  async queryVectorDatabase(query, parameters) {
    const queryEmbedding = await this.generateEmbedding(query);
    const { whereClauses, queryParams, paramCounter } =
      this.buildWhereClause(parameters);

    const similarityThreshold =
      parameters.query_type === "filtered" ? 0.3 : 0.0;
    if (similarityThreshold > 0) {
      whereClauses.push(
        `1 - (pe.embedding <=> $${paramCounter}) >= ${similarityThreshold}`
      );
    }

    const whereSQL = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const orderByClause = this.buildOrderByClause(
      parameters.sort_by || "similarity",
      paramCounter
    );

    const sqlQuery = `
      SELECT p.*, EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) AS edad,
        CASE WHEN EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) < 18 THEN 'Menor de edad'
             WHEN EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) BETWEEN 18 AND 65 THEN 'Adulto'
             ELSE 'Adulto mayor' END AS grupo_edad,
        1 - (pe.embedding <=> $${paramCounter}) AS similarity
      FROM personas_embeddings pe
      JOIN personas p ON pe.persona_id = p.id
      ${whereSQL}
      ORDER BY ${orderByClause}
      LIMIT $${paramCounter + 1}`;
    queryParams.push(pgvector.toSql(queryEmbedding), parameters.limit || 100);
    const results = (await this.pool.query(sqlQuery, queryParams)).rows;
    return results;
  }

  buildWhereClause(params) {
    const whereClauses = [];
    const queryParams = [];
    let paramCounter = 1;

    if (params.numero_documento) {
      whereClauses.push(`p.numero_documento = $${paramCounter++}`);
      queryParams.push(params.numero_documento);
    }
    if (params.tipo_documento) {
      whereClauses.push(`p.tipo_documento = $${paramCounter++}`);
      queryParams.push(params.tipo_documento);
    }

    const applyPattern = (value) =>
      value.includes("%") ? value : `%${value}%`;

    if (params.primer_nombre) {
      whereClauses.push(`p.primer_nombre ILIKE $${paramCounter++}`);
      queryParams.push(applyPattern(params.primer_nombre));
    }
    if (params.segundo_nombre) {
      whereClauses.push(`p.segundo_nombre ILIKE $${paramCounter++}`);
      queryParams.push(applyPattern(params.segundo_nombre));
    }
    if (params.apellidos) {
      whereClauses.push(`p.apellidos ILIKE $${paramCounter++}`);
      queryParams.push(applyPattern(params.apellidos));
    }
    if (params.nombre) {
      const pattern = applyPattern(params.nombre);
      whereClauses.push(
        `(p.primer_nombre ILIKE $${paramCounter} OR p.segundo_nombre ILIKE $${paramCounter} OR p.apellidos ILIKE $${paramCounter})`
      );
      queryParams.push(pattern);
      paramCounter++;
    }
    if (params.fecha_nacimiento_min && params.fecha_nacimiento_max) {
      whereClauses.push(
        `p.fecha_nacimiento BETWEEN $${paramCounter} AND $${paramCounter + 1}`
      );
      queryParams.push(
        params.fecha_nacimiento_min,
        params.fecha_nacimiento_max
      );
      paramCounter += 2;
    } else if (params.fecha_nacimiento_min) {
      whereClauses.push(`p.fecha_nacimiento >= $${paramCounter++}`);
      queryParams.push(params.fecha_nacimiento_min);
    } else if (params.fecha_nacimiento_max) {
      whereClauses.push(`p.fecha_nacimiento <= $${paramCounter++}`);
      queryParams.push(params.fecha_nacimiento_max);
    }
    if (params.edad_min !== null && params.edad_max !== null) {
      whereClauses.push(
        `EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) BETWEEN $${paramCounter} AND $${
          paramCounter + 1
        }`
      );
      queryParams.push(params.edad_min, params.edad_max);
      paramCounter += 2;
    } else if (params.edad_min !== null) {
      whereClauses.push(
        `EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) >= $${paramCounter++}`
      );
      queryParams.push(params.edad_min);
    } else if (params.edad_max !== null) {
      whereClauses.push(
        `EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) <= $${paramCounter++}`
      );
      queryParams.push(params.edad_max);
    }
    if (params.genero) {
      whereClauses.push(`p.genero = $${paramCounter++}`);
      queryParams.push(params.genero);
    }
    if (params.grupo_edad) {
      const grupoEdadConditions = {
        "Menor de edad": `EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) < 18`,
        Adulto: `EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) BETWEEN 18 AND 65`,
        "Adulto mayor": `EXTRACT(YEAR FROM AGE(p.fecha_nacimiento)) > 65`,
      };
      if (grupoEdadConditions[params.grupo_edad]) {
        whereClauses.push(grupoEdadConditions[params.grupo_edad]);
      }
    }
    if (params.correo_electronico) {
      whereClauses.push(`p.correo_electronico ILIKE $${paramCounter++}`);
      queryParams.push(applyPattern(params.correo_electronico));
    }
    if (params.celular) {
      whereClauses.push(`p.celular LIKE $${paramCounter++}`);
      queryParams.push(applyPattern(params.celular));
    }
    if (params.created_at_min && params.created_at_max) {
      whereClauses.push(
        `p.created_at BETWEEN $${paramCounter} AND $${paramCounter + 1}`
      );
      queryParams.push(params.created_at_min, params.created_at_max);
      paramCounter += 2;
    } else if (params.created_at_min) {
      whereClauses.push(`p.created_at >= $${paramCounter++}`);
      queryParams.push(params.created_at_min);
    } else if (params.created_at_max) {
      whereClauses.push(`p.created_at <= $${paramCounter++}`);
      queryParams.push(params.created_at_max);
    }
    if (params.updated_at_min && params.updated_at_max) {
      whereClauses.push(
        `p.updated_at BETWEEN $${paramCounter} AND $${paramCounter + 1}`
      );
      queryParams.push(params.updated_at_min, params.updated_at_max);
      paramCounter += 2;
    } else if (params.updated_at_min) {
      whereClauses.push(`p.updated_at >= $${paramCounter++}`);
      queryParams.push(params.updated_at_min);
    } else if (params.updated_at_max) {
      whereClauses.push(`p.updated_at <= $${paramCounter++}`);
      queryParams.push(params.updated_at_max);
    }
    return { whereClauses, queryParams, paramCounter };
  }

  async generateMarkdownResponse(query, vectorResults) {
    if (!vectorResults.length) {
      return `## Sin Resultados\n\nNo se encontraron empleados que coincidan con la consulta.`;
    }
    const dataContext = {
      total_resultados: vectorResults.length,
      muestra_completa: vectorResults.map((r) => ({
        nombre_completo: `${r.primer_nombre} ${r.segundo_nombre || ""} ${
          r.apellidos
        }`.trim(),
        edad: r.edad,
        genero: r.genero,
        grupo_edad: r.grupo_edad,
        tipo_documento: r.tipo_documento,
        numero_documento: r.numero_documento,
        correo_electronico: r.correo_electronico,
        celular: r.celular,
        fecha_nacimiento: r.fecha_nacimiento,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    };
    const prompt = `${this.SYSTEM_PROMPT}\n\nConsulta: "${query}"\n\nDatos (${
      vectorResults.length
    } registros):\n${JSON.stringify(
      dataContext,
      null,
      2
    )}\n\nGenera respuesta analítica en Markdown profesional.`;
    try {
      let markdown = await this.callAzureAI({
        systemMessage: this.SYSTEM_PROMPT,
        userMessage: prompt,
        temperature: this.chatConfig.temperature,
        maxTokens: this.chatConfig.max_tokens,
      });
      markdown = (markdown || "Error generando respuesta.")
        .replace(/```markdown\n?/gi, "")
        .replace(/```\n?$/g, "")
        .trim();
      return markdown;
    } catch (error) {
      console.error("Error generando markdown:", error.message);
      return this.generateFallbackMarkdown(vectorResults);
    }
  }

  generateFallbackMarkdown(results) {
    if (!results.length)
      return "## Sin Resultados\n\nNo se encontraron empleados.";
    let md = `## Resultados de Búsqueda\n\n**Total encontrado:** ${results.length}\n\n`;
    md += `| Nombre Completo | Edad | Género | Documento |\n|---|---|---|---|\n`;
    results.slice(0, 30).forEach((r) => {
      const nombreCompleto = `${r.primer_nombre} ${r.segundo_nombre || ""} ${
        r.apellidos
      }`.trim();
      md += `| ${nombreCompleto} | ${r.edad || "N/A"} | ${
        r.genero || "N/A"
      } | ${r.tipo_documento || ""} ${r.numero_documento || ""} |\n`;
    });
    if (results.length > 30)
      md += `\n*Mostrando 30 de ${results.length} resultados*`;
    return md;
  }

  async checkDB() {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async checkPgVector() {
    try {
      const result = await this.pool.query(
        `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists`
      );
      return result.rows[0].exists;
    } catch {
      return false;
    }
  }

  setupRoutes() {
    this.app.get("/health", async (req, res) => {
      try {
        const health = {
          status: this.serviceState.ready ? "healthy" : "starting",
          service: "nlp-service-v2",
          version: "2.0.0",
          uptime: Math.floor((Date.now() - this.serviceState.startTime) / 1000),
          dependencies: {
            postgresql: await this.checkDB(),
            pgvector: await this.checkPgVector(),
            azure_ai_foundry: !!(
              this.AZURE_FOUNDRY_ENDPOINT && this.AZURE_API_KEY
            ),
          },
          stats: {
            total_embeddings: this.serviceState.totalEmbeddings,
            last_sync: this.serviceState.lastSync,
          },
        };
        const allHealthy = Object.values(health.dependencies).every(Boolean);
        health.status =
          allHealthy && this.serviceState.ready ? "healthy" : "degraded";
        res.status(allHealthy ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({ status: "unhealthy", error: error.message });
      }
    });

    this.app.post("/query", async (req, res) => {
      const startTime = Date.now();
      const { query } = req.body;
      try {
        if (!query || typeof query !== "string" || query.length > 2000) {
          return res
            .status(400)
            .json({ success: false, error: "Query inválido (max 2000 chars)" });
        }
        const securityCheck = this.checkSecurityRisks(query);
        if (securityCheck.isDangerous) {
          return res.status(400).json({
            success: false,
            error: `Consulta no permitida: ${securityCheck.reason}`,
          });
        }
        const parameters = await this.extractQueryParameters(query);
        const results = await this.queryVectorDatabase(query, parameters);
        const markdownResponse = await this.generateMarkdownResponse(
          query,
          results
        );
        const response = {
          success: true,
          data: { markdown: markdownResponse, raw_results: results },
          metadata: {
            results_count: results.length,
            processing_time_ms: Date.now() - startTime,
            query_parameters: parameters,
            vector_search: true,
          },
        };
        await this.logTransaction("NLP_QUERY", query, "SUCCESS", req, response);
        res.json(response);
      } catch (error) {
        console.error("❌ Error query:", error.message);
        await this.logTransaction(
          "NLP_QUERY",
          query,
          "ERROR",
          req,
          null,
          error.message
        );
        res.status(500).json({
          success: false,
          error: "Error procesando consulta",
          details: error.message,
          metadata: { processing_time_ms: Date.now() - startTime },
        });
      }
    });

    this.app.post("/update-embedding", async (req, res) => {
      try {
        const { persona_id } = req.body;
        if (!persona_id)
          return res
            .status(400)
            .json({ success: false, error: "persona_id requerido" });
        const result = await this.pool.query(
          "SELECT * FROM personas_con_edad WHERE id = $1",
          [persona_id]
        );
        if (!result.rows.length)
          return res
            .status(404)
            .json({ success: false, error: "Persona no encontrada" });
        const persona = result.rows[0];
        const embeddingText = this.buildEmbeddingText(persona);
        const embedding = await this.generateEmbedding(embeddingText);
        await this.pool.query(
          `INSERT INTO personas_embeddings (persona_id, numero_documento, embedding, content_text)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (persona_id) DO UPDATE SET numero_documento = EXCLUDED.numero_documento, embedding = EXCLUDED.embedding, content_text = EXCLUDED.content_text, updated_at = CURRENT_TIMESTAMP`,
          [
            persona.id,
            persona.numero_documento,
            pgvector.toSql(embedding),
            embeddingText,
          ]
        );
        await this.updateServiceStats();
        await this.logTransaction(
          "UPDATE_EMBEDDING",
          `persona_id: ${persona_id}`,
          "SUCCESS",
          req
        );
        res.json({
          success: true,
          message: "Embedding actualizado",
          persona_id,
        });
      } catch (error) {
        console.error("Error update embedding:", error.message);
        await this.logTransaction(
          "UPDATE_EMBEDDING",
          req.body,
          "ERROR",
          req,
          null,
          error.message
        );
        res.status(500).json({
          success: false,
          error: "Error actualizando embedding",
          details: error.message,
        });
      }
    });

    this.app.post("/sync-embeddings", async (req, res) => {
      try {
        const result = await this.pool.query(
          "SELECT * FROM personas_con_edad ORDER BY id"
        );
        const { successCount, errorCount } = await this.processBatchEmbeddings(
          result.rows
        );
        this.serviceState.lastSync = new Date().toISOString();
        await this.updateServiceStats();
        await this.logTransaction(
          "SYNC_EMBEDDINGS",
          `Total: ${result.rows.length}`,
          "SUCCESS",
          req,
          { successCount, errorCount }
        );
        res.json({
          success: true,
          message: "Sincronización completada",
          stats: {
            total: result.rows.length,
            success: successCount,
            errors: errorCount,
            synced_at: this.serviceState.lastSync,
          },
        });
      } catch (error) {
        console.error("Error sync:", error.message);
        await this.logTransaction(
          "SYNC_EMBEDDINGS",
          "bulk",
          "ERROR",
          req,
          null,
          error.message
        );
        res.status(500).json({
          success: false,
          error: "Error en sincronización",
          details: error.message,
        });
      }
    });

    this.app.get("/stats", async (req, res) => {
      try {
        const dbStats = await this.pool.query(`
          SELECT COUNT(*) as total_personas,
                 COUNT(CASE WHEN fecha_nacimiento IS NOT NULL THEN 1 END) as personas_con_edad,
                 COUNT(CASE WHEN correo_electronico IS NOT NULL THEN 1 END) as personas_con_email,
                 MAX(created_at) as ultima_persona_creada
          FROM personas`);
        const embeddingsStats = await this.pool.query(
          `SELECT COUNT(*) as total_embeddings FROM personas_embeddings`
        );
        res.json({
          success: true,
          stats: {
            database: {
              total_personas: parseInt(dbStats.rows[0].total_personas),
              personas_con_edad: parseInt(dbStats.rows[0].personas_con_edad),
              personas_con_email: parseInt(dbStats.rows[0].personas_con_email),
              ultima_persona: dbStats.rows[0].ultima_persona_creada,
            },
            embeddings: {
              total_embeddings: parseInt(
                embeddingsStats.rows[0].total_embeddings
              ),
              vector_size: this.VECTOR_SIZE,
              distance_metric: "cosine",
            },
            service: {
              version: "2.0.0",
              uptime_seconds: Math.floor(
                (Date.now() - this.serviceState.startTime) / 1000
              ),
              last_sync: this.serviceState.lastSync,
              ready: this.serviceState.ready,
            },
          },
        });
      } catch (error) {
        console.error("Error stats:", error.message);
        res.status(500).json({
          success: false,
          error: "Error obteniendo estadísticas",
          details: error.message,
        });
      }
    });

    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: "Ruta no encontrada",
        endpoints: [
          "GET /health",
          "POST /query",
          "POST /update-embedding",
          "POST /sync-embeddings",
          "GET /stats",
        ],
      });
    });

    this.app.use((err, req, res, next) => {
      console.error("Error:", err.message);
      res
        .status(500)
        .json({ success: false, error: "Error interno", details: err.message });
    });
  }

  registerService() {
    createServiceRegistryClient({
      serviceId: "nlp-service-v2",
      name: "nlp-service",
      host: "nlp-service",
      port: parseInt(this.PORT),
      protocol: "http",
      metadata: {
        version: "2.0.0",
        description: "NLP service with RAG using Azure AI Foundry and pgvector",
        healthEndpoint: "/health",
        tags: ["nlp", "ai", "azure", "pgvector", "rag"],
        capabilities: [
          "nlp-query",
          "vector-search",
          "embeddings",
          "semantic-search",
        ],
      },
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
process.on("SIGTERM", async () => {
  console.log("\n🔄 Cerrando servicio...");
  await nlpService.pool.end();
  process.exit(0);
});
