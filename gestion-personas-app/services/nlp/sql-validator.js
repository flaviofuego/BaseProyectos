/**
 * SQL Validator - Valida consultas SQL para seguridad y corrección
 */

class SQLValidator {
  /**
   * @param {Pool} pool - Pool de conexión PostgreSQL
   */
  constructor(pool) {
    this.pool = pool;
    
    // Tablas permitidas para consultas
    this.allowedTables = [
      'personas',
      'personas_con_edad',
      'users',
      'user_preferences',
      'transaction_logs'
    ];

    // Columnas sensibles que no deben exponerse
    this.sensitiveColumns = [
      'password_hash',
      'provider_id'
    ];

    // Operaciones prohibidas
    this.forbiddenOperations = [
      'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE',
      'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'EXECUTE',
      'COPY', 'VACUUM', 'REINDEX', 'CLUSTER'
    ];
  }

  /**
   * Valida una consulta SQL
   * @param {string} sql - Consulta SQL a validar
   * @returns {Promise<Object>} Resultado de validación
   */
  async validate(sql) {
    const errors = [];
    const warnings = [];

    // Normalizar SQL
    const normalizedSQL = sql.trim().toUpperCase();

    // 1. Verificar que sea SELECT
    if (!normalizedSQL.startsWith('SELECT')) {
      errors.push('Solo se permiten consultas SELECT');
    }

    // 2. Verificar operaciones prohibidas
    for (const op of this.forbiddenOperations) {
      const regex = new RegExp(`\\b${op}\\b`, 'i');
      if (regex.test(normalizedSQL)) {
        errors.push(`Operación prohibida: ${op}`);
      }
    }

    // 3. Verificar múltiples sentencias
    if (sql.includes(';') && sql.indexOf(';') < sql.length - 1) {
      // Permitir ; al final, pero no múltiples sentencias
      const statements = sql.split(';').filter(s => s.trim().length > 0);
      if (statements.length > 1) {
        errors.push('No se permiten múltiples sentencias SQL');
      }
    }

    // 4. Verificar comentarios SQL (potencial inyección)
    if (sql.includes('--') || sql.includes('/*')) {
      warnings.push('La consulta contiene comentarios SQL');
    }

    // 5. Verificar acceso a tablas del sistema
    if (/\bpg_\w+/i.test(sql) || /\binformation_schema\b/i.test(sql)) {
      errors.push('No se permite acceso a tablas del sistema');
    }

    // 6. Verificar columnas sensibles
    for (const col of this.sensitiveColumns) {
      const regex = new RegExp(`\\b${col}\\b`, 'i');
      if (regex.test(sql)) {
        errors.push(`No se permite acceder a la columna sensible: ${col}`);
      }
    }

    // 7. Verificar LIMIT
    if (!normalizedSQL.includes('LIMIT')) {
      warnings.push('La consulta no tiene LIMIT - se recomienda limitar resultados');
    }

    // 8. Verificar sintaxis con EXPLAIN (sin ejecutar)
    if (errors.length === 0) {
      try {
        await this.pool.query(`EXPLAIN ${sql}`);
      } catch (error) {
        errors.push(`Error de sintaxis SQL: ${error.message}`);
      }
    }

    // 9. Extraer tablas usadas y verificar
    const tablesUsed = this.extractTables(sql);
    for (const table of tablesUsed) {
      if (!this.allowedTables.includes(table.toLowerCase())) {
        errors.push(`Tabla no permitida: ${table}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      tablesUsed,
      hasLimit: normalizedSQL.includes('LIMIT'),
      estimatedComplexity: this.estimateComplexity(sql)
    };
  }

  /**
   * Extrae nombres de tablas de una consulta SQL
   * @param {string} sql - Consulta SQL
   * @returns {Array<string>} Lista de tablas
   */
  extractTables(sql) {
    const tables = new Set();
    
    // Patrones para encontrar tablas
    const patterns = [
      /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
      /JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
      /INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
      /UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        tables.add(match[1]);
      }
    }

    return [...tables];
  }

  /**
   * Estima la complejidad de una consulta
   * @param {string} sql - Consulta SQL
   * @returns {string} Nivel de complejidad (low, medium, high)
   */
  estimateComplexity(sql) {
    const normalizedSQL = sql.toUpperCase();
    let score = 0;

    // Factores que aumentan complejidad
    if (normalizedSQL.includes('JOIN')) score += 2;
    if (normalizedSQL.includes('LEFT JOIN') || normalizedSQL.includes('RIGHT JOIN')) score += 1;
    if (normalizedSQL.includes('SUBQUERY') || sql.includes('(SELECT')) score += 3;
    if (normalizedSQL.includes('GROUP BY')) score += 1;
    if (normalizedSQL.includes('HAVING')) score += 1;
    if (normalizedSQL.includes('ORDER BY')) score += 0.5;
    if (normalizedSQL.includes('DISTINCT')) score += 0.5;
    if ((normalizedSQL.match(/AND|OR/g) || []).length > 3) score += 1;
    if (normalizedSQL.includes('CASE')) score += 1;
    if (normalizedSQL.includes('WITH')) score += 2; // CTE

    if (score <= 2) return 'low';
    if (score <= 5) return 'medium';
    return 'high';
  }

  /**
   * Sanitiza parámetros de una consulta
   * @param {Array} params - Parámetros a sanitizar
   * @returns {Array} Parámetros sanitizados
   */
  sanitizeParams(params) {
    return params.map(param => {
      if (typeof param === 'string') {
        // Escapar caracteres especiales
        return param
          .replace(/'/g, "''")
          .replace(/\\/g, '\\\\');
      }
      return param;
    });
  }

  /**
   * Verifica si la consulta accede solo a datos del usuario
   * @param {string} sql - Consulta SQL
   * @param {number} userId - ID del usuario
   * @returns {boolean} true si la consulta está limitada al usuario
   */
  isUserScoped(sql, userId) {
    const normalizedSQL = sql.toUpperCase();
    
    // Verificar si hay filtro por user_id
    return normalizedSQL.includes('USER_ID') && 
           (sql.includes(`= ${userId}`) || sql.includes('$'));
  }

  /**
   * Agrega una tabla a la lista de permitidas
   * @param {string} tableName - Nombre de la tabla
   */
  addAllowedTable(tableName) {
    if (!this.allowedTables.includes(tableName.toLowerCase())) {
      this.allowedTables.push(tableName.toLowerCase());
    }
  }

  /**
   * Genera una versión segura de la consulta
   * @param {string} sql - Consulta original
   * @param {number} maxLimit - Límite máximo de resultados
   * @returns {string} Consulta segura
   */
  makeSafe(sql, maxLimit = 100) {
    let safeSql = sql.trim();

    // Remover punto y coma final si existe
    if (safeSql.endsWith(';')) {
      safeSql = safeSql.slice(0, -1);
    }

    // Agregar LIMIT si no existe
    if (!safeSql.toUpperCase().includes('LIMIT')) {
      safeSql += ` LIMIT ${maxLimit}`;
    } else {
      // Verificar que el límite no sea muy alto
      const limitMatch = safeSql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch && parseInt(limitMatch[1]) > maxLimit) {
        safeSql = safeSql.replace(/LIMIT\s+\d+/i, `LIMIT ${maxLimit}`);
      }
    }

    return safeSql;
  }
}

module.exports = SQLValidator;
