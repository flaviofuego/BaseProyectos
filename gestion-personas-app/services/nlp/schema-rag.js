/**
 * Schema RAG - Recuperación de metadatos del esquema de base de datos
 * Proporciona información sobre tablas, columnas y relaciones para Text-to-SQL
 */

class SchemaRAG {
  /**
   * @param {Pool} pool - Pool de conexión PostgreSQL
   */
  constructor(pool) {
    this.pool = pool;
    this.schemaCache = null;
    this.cacheTTL = 300000; // 5 minutos
    this.cacheTimestamp = null;
  }

  /**
   * Obtiene el esquema completo de la base de datos
   * @param {boolean} useCache - Usar cache (default: true)
   * @returns {Promise<Object>} Esquema de la BD
   */
  async getSchema(useCache = true) {
    // Verificar cache
    if (useCache && this.schemaCache && this.cacheTimestamp) {
      if (Date.now() - this.cacheTimestamp < this.cacheTTL) {
        return this.schemaCache;
      }
    }

    // Obtener información de tablas y columnas
    const tablesResult = await this.pool.query(`
      SELECT 
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        (
          SELECT pg_catalog.col_description(
            (SELECT oid FROM pg_class WHERE relname = c.table_name), 
            c.ordinal_position
          )
        ) as column_comment
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name NOT LIKE 'flyway%'
        AND c.table_name NOT LIKE 'schema_%'
      ORDER BY c.table_name, c.ordinal_position
    `);

    // Obtener relaciones (foreign keys)
    const relationshipsResult = await this.pool.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);

    // Obtener primary keys
    const primaryKeysResult = await this.pool.query(`
      SELECT 
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    `);

    // Obtener vistas
    const viewsResult = await this.pool.query(`
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
    `);

    // Organizar información por tabla
    const tables = {};
    for (const row of tablesResult.rows) {
      if (!tables[row.table_name]) {
        tables[row.table_name] = {
          name: row.table_name,
          columns: [],
          primaryKey: null,
          foreignKeys: [],
          isView: false
        };
      }
      tables[row.table_name].columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default,
        maxLength: row.character_maximum_length,
        comment: row.column_comment
      });
    }

    // Agregar primary keys
    for (const pk of primaryKeysResult.rows) {
      if (tables[pk.table_name]) {
        tables[pk.table_name].primaryKey = pk.column_name;
      }
    }

    // Agregar foreign keys
    for (const fk of relationshipsResult.rows) {
      if (tables[fk.table_name]) {
        tables[fk.table_name].foreignKeys.push({
          column: fk.column_name,
          references: {
            table: fk.foreign_table,
            column: fk.foreign_column
          }
        });
      }
    }

    // Marcar vistas
    for (const view of viewsResult.rows) {
      if (tables[view.table_name]) {
        tables[view.table_name].isView = true;
        tables[view.table_name].viewDefinition = view.view_definition;
      }
    }

    this.schemaCache = {
      tables,
      relationships: relationshipsResult.rows,
      lastUpdated: new Date().toISOString()
    };
    this.cacheTimestamp = Date.now();

    return this.schemaCache;
  }

  /**
   * Construye un prompt con la información del esquema para el LLM
   * @param {Array<string>} relevantTables - Tablas relevantes para la consulta
   * @returns {Promise<string>} Prompt con el esquema
   */
  async buildSchemaPrompt(relevantTables = null) {
    const schema = await this.getSchema();
    const tables = schema.tables;
    
    let prompt = '## ESQUEMA DE BASE DE DATOS\n\n';

    // Filtrar tablas si se especifican
    const tablesToInclude = relevantTables 
      ? Object.keys(tables).filter(t => relevantTables.includes(t))
      : Object.keys(tables);

    for (const tableName of tablesToInclude) {
      const table = tables[tableName];
      prompt += `### Tabla: ${tableName}${table.isView ? ' (VISTA)' : ''}\n`;
      prompt += `Columnas:\n`;
      
      for (const col of table.columns) {
        let colDesc = `  - ${col.name}: ${col.type}`;
        if (!col.nullable) colDesc += ' NOT NULL';
        if (col.name === table.primaryKey) colDesc += ' PRIMARY KEY';
        if (col.comment) colDesc += ` -- ${col.comment}`;
        prompt += colDesc + '\n';
      }

      if (table.foreignKeys.length > 0) {
        prompt += 'Relaciones:\n';
        for (const fk of table.foreignKeys) {
          prompt += `  - ${fk.column} → ${fk.references.table}(${fk.references.column})\n`;
        }
      }
      prompt += '\n';
    }

    // Agregar notas especiales
    prompt += '## NOTAS IMPORTANTES\n';
    prompt += '- La vista "personas_con_edad" incluye campos calculados: edad, grupo_edad\n';
    prompt += '- Los géneros válidos son: Masculino, Femenino, No binario, Prefiero no reportar\n';
    prompt += '- Los tipos de documento son: Cédula, Tarjeta de identidad\n';
    prompt += '- Las fechas están en formato YYYY-MM-DD\n';

    return prompt;
  }

  /**
   * Obtiene las tablas relevantes para una consulta basándose en keywords
   * @param {string} query - Consulta del usuario
   * @returns {Promise<Array<string>>} Lista de tablas relevantes
   */
  async getRelevantTables(query) {
    const queryLower = query.toLowerCase();
    const relevantTables = [];

    // Mapeo de keywords a tablas
    const keywordMap = {
      'persona': ['personas', 'personas_con_edad'],
      'usuario': ['users', 'user_preferences'],
      'user': ['users', 'user_preferences'],
      'preferencia': ['user_preferences'],
      'log': ['transaction_logs'],
      'transacci': ['transaction_logs'],
      'auditoria': ['transaction_logs'],
      'edad': ['personas_con_edad'],
      'adulto': ['personas_con_edad'],
      'menor': ['personas_con_edad']
    };

    for (const [keyword, tables] of Object.entries(keywordMap)) {
      if (queryLower.includes(keyword)) {
        relevantTables.push(...tables);
      }
    }

    // Si no se encontraron tablas específicas, incluir las principales
    if (relevantTables.length === 0) {
      relevantTables.push('personas', 'personas_con_edad', 'users');
    }

    // Eliminar duplicados
    return [...new Set(relevantTables)];
  }

  /**
   * Limpia el cache del esquema
   */
  clearCache() {
    this.schemaCache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Verifica si una tabla existe en el esquema
   * @param {string} tableName - Nombre de la tabla
   * @returns {Promise<boolean>}
   */
  async tableExists(tableName) {
    const schema = await this.getSchema();
    return !!schema.tables[tableName];
  }

  /**
   * Verifica si una columna existe en una tabla
   * @param {string} tableName - Nombre de la tabla
   * @param {string} columnName - Nombre de la columna
   * @returns {Promise<boolean>}
   */
  async columnExists(tableName, columnName) {
    const schema = await this.getSchema();
    const table = schema.tables[tableName];
    if (!table) return false;
    return table.columns.some(c => c.name === columnName);
  }
}

module.exports = SchemaRAG;
