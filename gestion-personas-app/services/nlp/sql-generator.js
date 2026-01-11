/**
 * SQL Generator - Genera consultas SQL a partir de lenguaje natural usando LLM
 */

const SQLValidator = require('./sql-validator');

class SQLGenerator {
  /**
   * @param {SchemaRAG} schemaRAG - Instancia de SchemaRAG
   * @param {Object} azureClient - Cliente de Azure OpenAI
   * @param {Pool} pool - Pool de PostgreSQL para validación
   */
  constructor(schemaRAG, azureClient, pool) {
    this.schemaRAG = schemaRAG;
    this.azureClient = azureClient;
    this.pool = pool;
    this.validator = new SQLValidator(pool);
  }

  /**
   * Genera una consulta SQL a partir de lenguaje natural
   * @param {string} naturalQuery - Consulta en lenguaje natural
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Resultado con SQL, parámetros y explicación
   */
  async generateSQL(naturalQuery, options = {}) {
    const { maxResults = 100, allowAggregations = true } = options;

    // Obtener tablas relevantes
    const relevantTables = await this.schemaRAG.getRelevantTables(naturalQuery);
    
    // Construir prompt con esquema
    const schemaPrompt = await this.schemaRAG.buildSchemaPrompt(relevantTables);

    const systemPrompt = `Eres un experto en PostgreSQL. Tu tarea es generar consultas SQL seguras y eficientes.

${schemaPrompt}

## REGLAS ESTRICTAS
1. SOLO generar SELECT (NUNCA INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER)
2. SIEMPRE limitar resultados a máximo ${maxResults} registros usando LIMIT
3. Usar parámetros ($1, $2, etc.) para valores dinámicos cuando sea apropiado
4. Usar aliases descriptivos para columnas calculadas
5. Manejar valores NULL apropiadamente con COALESCE o IS NULL
6. Preferir la vista "personas_con_edad" sobre "personas" cuando se necesite edad o grupo_edad
7. NUNCA exponer datos sensibles como password_hash
8. Para búsquedas de texto usar ILIKE con % para coincidencias parciales
${allowAggregations ? '9. Se permiten agregaciones (COUNT, SUM, AVG, GROUP BY)' : '9. NO usar agregaciones'}

## FORMATO DE RESPUESTA
Responde SOLO con un JSON válido (sin markdown, sin comentarios):
{
  "sql": "SELECT ... LIMIT ${maxResults}",
  "params": [],
  "explanation": "Explicación breve de qué hace la consulta",
  "tables_used": ["tabla1", "tabla2"],
  "confidence": 0.95
}`;

    const userPrompt = `Genera una consulta SQL para: "${naturalQuery}"`;

    try {
      // Llamar al LLM
      const response = await this.azureClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Baja temperatura para respuestas más deterministas
        max_tokens: 1000
      });

      // Parsear respuesta
      const result = this.parseResponse(response);

      // Validar SQL generado
      const validation = await this.validator.validate(result.sql);
      
      if (!validation.isValid) {
        throw new Error(`SQL inválido: ${validation.errors.join(', ')}`);
      }

      // Agregar metadata de validación
      result.validation = validation;
      result.original_query = naturalQuery;

      return result;
    } catch (error) {
      console.error('Error generating SQL:', error);
      throw new Error(`No se pudo generar SQL: ${error.message}`);
    }
  }

  /**
   * Parsea la respuesta del LLM
   * @param {string} response - Respuesta del LLM
   * @returns {Object} Objeto parseado
   */
  parseResponse(response) {
    try {
      // Limpiar respuesta (quitar markdown si existe)
      let cleaned = response.trim();
      
      // Remover bloques de código markdown
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }

      const parsed = JSON.parse(cleaned);

      // Validar campos requeridos
      if (!parsed.sql) {
        throw new Error('Falta campo "sql" en la respuesta');
      }

      return {
        sql: parsed.sql,
        params: parsed.params || [],
        explanation: parsed.explanation || 'Sin explicación',
        tables_used: parsed.tables_used || [],
        confidence: parsed.confidence || 0.5
      };
    } catch (error) {
      throw new Error(`Error parseando respuesta del LLM: ${error.message}`);
    }
  }

  /**
   * Genera SQL para consultas comunes predefinidas
   * @param {string} queryType - Tipo de consulta
   * @param {Object} params - Parámetros de la consulta
   * @returns {Object} SQL predefinido
   */
  getPredefinedQuery(queryType, params = {}) {
    const queries = {
      // Estadísticas generales
      'stats_personas': {
        sql: `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN genero = 'Masculino' THEN 1 END) as masculino,
          COUNT(CASE WHEN genero = 'Femenino' THEN 1 END) as femenino,
          COUNT(CASE WHEN genero = 'No binario' THEN 1 END) as no_binario,
          COUNT(CASE WHEN tipo_documento = 'Cédula' THEN 1 END) as cedulas,
          COUNT(CASE WHEN tipo_documento = 'Tarjeta de identidad' THEN 1 END) as tarjetas_identidad
        FROM personas`,
        params: [],
        explanation: 'Estadísticas generales de personas'
      },

      // Distribución por edad
      'stats_edad': {
        sql: `SELECT 
          grupo_edad,
          COUNT(*) as cantidad,
          ROUND(AVG(edad)::numeric, 1) as edad_promedio
        FROM personas_con_edad
        GROUP BY grupo_edad
        ORDER BY 
          CASE grupo_edad 
            WHEN 'Menor de edad' THEN 1 
            WHEN 'Adulto' THEN 2 
            ELSE 3 
          END`,
        params: [],
        explanation: 'Distribución de personas por grupo de edad'
      },

      // Búsqueda por documento
      'buscar_documento': {
        sql: `SELECT p.*, 
          EXTRACT(YEAR FROM AGE(fecha_nacimiento)) AS edad
        FROM personas p 
        WHERE numero_documento = $1`,
        params: [params.documento],
        explanation: 'Búsqueda de persona por número de documento'
      },

      // Últimos registros
      'ultimos_registros': {
        sql: `SELECT p.*, 
          EXTRACT(YEAR FROM AGE(fecha_nacimiento)) AS edad
        FROM personas p 
        ORDER BY created_at DESC 
        LIMIT $1`,
        params: [params.limit || 10],
        explanation: 'Últimas personas registradas'
      },

      // Logs recientes
      'logs_recientes': {
        sql: `SELECT 
          transaction_type,
          entity_type,
          numero_documento,
          status,
          created_at
        FROM transaction_logs
        ORDER BY created_at DESC
        LIMIT $1`,
        params: [params.limit || 50],
        explanation: 'Logs de transacciones recientes'
      },

      // Usuarios activos
      'usuarios_activos': {
        sql: `SELECT 
          u.id, u.username, u.email, u.provider,
          up.consulta_service_enabled,
          u.created_at
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        ORDER BY u.created_at DESC`,
        params: [],
        explanation: 'Lista de usuarios con sus preferencias'
      }
    };

    const query = queries[queryType];
    if (!query) {
      return null;
    }

    return {
      ...query,
      predefined: true,
      type: queryType
    };
  }

  /**
   * Detecta si una consulta es maliciosa o peligrosa
   * @param {string} query - Consulta a analizar
   * @returns {Object} Resultado del análisis
   */
  detectMaliciousQuery(query) {
    const queryLower = query.toLowerCase();
    
    const dangerousPatterns = [
      { pattern: /drop\s+table/i, risk: 'DROP TABLE detectado' },
      { pattern: /delete\s+from/i, risk: 'DELETE detectado' },
      { pattern: /truncate/i, risk: 'TRUNCATE detectado' },
      { pattern: /update\s+\w+\s+set/i, risk: 'UPDATE detectado' },
      { pattern: /insert\s+into/i, risk: 'INSERT detectado' },
      { pattern: /alter\s+table/i, risk: 'ALTER TABLE detectado' },
      { pattern: /grant\s+/i, risk: 'GRANT detectado' },
      { pattern: /revoke\s+/i, risk: 'REVOKE detectado' },
      { pattern: /--/g, risk: 'Comentario SQL detectado' },
      { pattern: /;\s*\w+/i, risk: 'Múltiples sentencias detectadas' },
      { pattern: /pg_/i, risk: 'Acceso a tablas de sistema' },
      { pattern: /information_schema/i, risk: 'Acceso a metadatos' },
      { pattern: /password|hash|secret|token/i, risk: 'Búsqueda de datos sensibles' }
    ];

    const risks = [];
    for (const { pattern, risk } of dangerousPatterns) {
      if (pattern.test(queryLower)) {
        risks.push(risk);
      }
    }

    return {
      isDangerous: risks.length > 0,
      risks,
      query: query.substring(0, 100)
    };
  }
}

module.exports = SQLGenerator;
