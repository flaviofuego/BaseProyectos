/**
 * Motor de ejecución de consultas SQL
 * Maneja la traducción de intenciones a consultas SQL optimizadas
 */

class SQLQueryEngine {
  constructor(pool) {
    this.pool = pool;
    this.validColumns = [
      'id', 'primer_nombre', 'segundo_nombre', 'apellidos', 
      'numero_documento', 'tipo_documento', 'fecha_nacimiento',
      'genero', 'correo_electronico', 'celular'
    ];
  }

  /**
   * Ejecuta una consulta basada en la intención clasificada
   */
  async executeQuery(queryIntent, embeddingsManager = null) {
    const { intent, parameters } = queryIntent;

    try {
      switch (intent) {
        case 'security_blocked':
          return this.handleSecurityBlocked();

        case 'comparative_query':
          return await this.executeComparativeQuery(parameters);

        case 'counting_query':
          return await this.executeCountingQuery(parameters);

        case 'statistical_query':
          return await this.executeStatisticalQuery(parameters);

        case 'name_pattern_search':
          return await this.executeNamePatternSearch(parameters);

        case 'search_direct':
          return await this.executeDirectSearch(parameters);

        case 'age_range_query':
          return await this.executeAgeRangeQuery(parameters);

        case 'document_search':
          return await this.executeDocumentSearch(parameters);

        case 'contact_search':
          return await this.executeContactSearch(parameters);

        case 'structured_list_query':
          return await this.executeStructuredListQuery(parameters);

        case 'demographic_analysis':
          return await this.executeDemographicAnalysis(parameters);

        case 'complex_filter':
          return await this.executeComplexFilter(parameters);

        case 'search_semantic':
        default:
          return await this.executeSemanticSearch(queryIntent, embeddingsManager);
      }
    } catch (error) {
      console.error('❌ Error ejecutando consulta SQL:', error);
      return {
        data: null,
        count: 0,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Maneja consultas bloqueadas por seguridad
   */
  handleSecurityBlocked() {
    return {
      data: null,
      count: 0,
      message: 'Consulta bloqueada por seguridad',
      success: false,
      blocked: true
    };
  }

  /**
   * Ejecuta consultas comparativas (más joven, más viejo)
   */
  async executeComparativeQuery(parameters) {
    const { comparison_type } = parameters;
    
    let orderBy = 'fecha_nacimiento DESC'; // Más joven por defecto
    if (comparison_type === 'oldest') {
      orderBy = 'fecha_nacimiento ASC';
    }

    const query = `
      SELECT *, 
             EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad,
             CASE 
               WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 18 THEN 'Menor de edad'
               WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 30 THEN 'Joven adulto'
               WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 50 THEN 'Adulto'
               WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 65 THEN 'Adulto mayor'
               ELSE 'Tercera edad'
             END as categoria_edad
      FROM personas
      WHERE fecha_nacimiento IS NOT NULL
      ORDER BY ${orderBy}
      LIMIT 1
    `;

    const result = await this.pool.query(query);
    
    return {
      data: result.rows[0] || null,
      count: result.rows.length,
      query_type: 'comparative',
      comparison_type,
      success: true
    };
  }

  /**
   * Ejecuta consultas de conteo con filtros
   */
  async executeCountingQuery(parameters) {
    const { whereClause, params } = this.buildWhereClause(parameters);
    
    const countQuery = `
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN genero = 'Masculino' THEN 1 END) as masculinos,
             COUNT(CASE WHEN genero = 'Femenino' THEN 1 END) as femeninas,
             COUNT(CASE WHEN genero = 'No binario' THEN 1 END) as no_binarios,
             AVG(EXTRACT(YEAR FROM AGE(fecha_nacimiento))) as edad_promedio
      FROM personas
      ${whereClause}
    `;

    const result = await this.pool.query(countQuery, params);
    const stats = result.rows[0];

    return {
      count: parseInt(stats.total),
      stats: {
        total: parseInt(stats.total),
        masculinos: parseInt(stats.masculinos),
        femeninas: parseInt(stats.femeninas),
        no_binarios: parseInt(stats.no_binarios),
        edad_promedio: Math.round(parseFloat(stats.edad_promedio) || 0)
      },
      query_type: 'counting',
      filters_applied: parameters,
      success: true
    };
  }

  /**
   * Ejecuta consultas estadísticas avanzadas
   */
  async executeStatisticalQuery(parameters) {
    const generalStats = await this.pool.query(`
      SELECT 
        COUNT(*) as total_personas,
        COUNT(CASE WHEN genero = 'Masculino' THEN 1 END) as total_masculino,
        COUNT(CASE WHEN genero = 'Femenino' THEN 1 END) as total_femenino,
        COUNT(CASE WHEN genero = 'No binario' THEN 1 END) as total_no_binario,
        AVG(EXTRACT(YEAR FROM AGE(fecha_nacimiento))) as edad_promedio,
        MIN(EXTRACT(YEAR FROM AGE(fecha_nacimiento))) as edad_minima,
        MAX(EXTRACT(YEAR FROM AGE(fecha_nacimiento))) as edad_maxima,
        COUNT(DISTINCT tipo_documento) as tipos_documento_diferentes
      FROM personas
      WHERE fecha_nacimiento IS NOT NULL
    `);

    const ageDistribution = await this.pool.query(`
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 18 THEN 'Menor de edad'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 30 THEN 'Joven adulto (18-29)'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 50 THEN 'Adulto (30-49)'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 65 THEN 'Adulto mayor (50-64)'
          ELSE 'Tercera edad (65+)'
        END as categoria_edad,
        COUNT(*) as cantidad,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM personas WHERE fecha_nacimiento IS NOT NULL), 2) as porcentaje
      FROM personas
      WHERE fecha_nacimiento IS NOT NULL
      GROUP BY categoria_edad
      ORDER BY MIN(EXTRACT(YEAR FROM AGE(fecha_nacimiento)))
    `);

    const documentTypes = await this.pool.query(`
      SELECT tipo_documento, COUNT(*) as cantidad
      FROM personas
      WHERE tipo_documento IS NOT NULL
      GROUP BY tipo_documento
      ORDER BY cantidad DESC
    `);

    return {
      stats: {
        general: generalStats.rows[0],
        distribucion_edad: ageDistribution.rows,
        tipos_documento: documentTypes.rows
      },
      query_type: 'statistical',
      success: true
    };
  }

  /**
   * Ejecuta búsquedas por patrones en nombres
   */
  async executeNamePatternSearch(parameters) {
    const { letter, field = 'primer_nombre', pattern } = parameters;
    
    let whereCondition = '';
    let queryParams = [];
    
    if (letter) {
      whereCondition = `${field} ILIKE $1`;
      queryParams = [`${letter}%`];
    } else if (pattern) {
      whereCondition = `${field} ILIKE $1`;
      queryParams = [`%${pattern}%`];
    }

    const query = `
      SELECT *, 
             EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
      FROM personas 
      WHERE ${whereCondition}
      ORDER BY ${field}, apellidos
      LIMIT 50
    `;

    const result = await this.pool.query(query, queryParams);

    return {
      data: result.rows,
      count: result.rows.length,
      query_type: 'name_pattern',
      pattern_applied: { letter, field, pattern },
      success: true,
      has_results: result.rows.length > 0
    };
  }

  /**
   * Ejecuta búsquedas directas por campos específicos
   */
  async executeDirectSearch(parameters) {
    const { whereClause, params } = this.buildWhereClause(parameters);
    
    const query = `
      SELECT *, 
             EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
      FROM personas 
      ${whereClause}
      ORDER BY primer_nombre, apellidos
      LIMIT 100
    `;

    const result = await this.pool.query(query, params);

    return {
      data: result.rows,
      count: result.rows.length,
      query_type: 'direct_search',
      filters_applied: parameters,
      success: true
    };
  }

  /**
   * Ejecuta consultas por rango de edad
   */
  async executeAgeRangeQuery(parameters) {
    const { edad_min, edad_max } = parameters;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (edad_min !== undefined) {
      conditions.push(`EXTRACT(YEAR FROM AGE(fecha_nacimiento)) >= $${paramIndex}`);
      params.push(edad_min);
      paramIndex++;
    }

    if (edad_max !== undefined) {
      conditions.push(`EXTRACT(YEAR FROM AGE(fecha_nacimiento)) <= $${paramIndex}`);
      params.push(edad_max);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT *, 
             EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
      FROM personas 
      ${whereClause}
      ORDER BY fecha_nacimiento DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query, params);

    return {
      data: result.rows,
      count: result.rows.length,
      query_type: 'age_range',
      age_range: { edad_min, edad_max },
      success: true
    };
  }

  /**
   * Ejecuta búsquedas por documento
   */
  async executeDocumentSearch(parameters) {
    const { numero_documento, tipo_documento } = parameters;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (numero_documento) {
      conditions.push(`numero_documento = $${paramIndex}`);
      params.push(numero_documento);
      paramIndex++;
    }

    if (tipo_documento) {
      conditions.push(`tipo_documento = $${paramIndex}`);
      params.push(tipo_documento);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT *, 
             EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
      FROM personas 
      ${whereClause}
      ORDER BY primer_nombre, apellidos
    `;

    const result = await this.pool.query(query, params);

    return {
      data: result.rows,
      count: result.rows.length,
      query_type: 'document_search',
      document_criteria: { numero_documento, tipo_documento },
      success: true,
      has_results: result.rows.length > 0
    };
  }

  /**
   * Ejecuta búsquedas por información de contacto
   */
  async executeContactSearch(parameters) {
    const { correo_electronico, celular } = parameters;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (correo_electronico) {
      conditions.push(`correo_electronico ILIKE $${paramIndex}`);
      params.push(`%${correo_electronico}%`);
      paramIndex++;
    }

    if (celular) {
      conditions.push(`celular = $${paramIndex}`);
      params.push(celular);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT *, 
             EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
      FROM personas 
      ${whereClause}
      ORDER BY primer_nombre, apellidos
    `;

    const result = await this.pool.query(query, params);

    return {
      data: result.rows,
      count: result.rows.length,
      query_type: 'contact_search',
      contact_criteria: { correo_electronico, celular },
      success: true,
      has_results: result.rows.length > 0
    };
  }

  /**
   * Ejecuta análisis demográfico avanzado
   */
  async executeDemographicAnalysis(parameters) {
    const genderStats = await this.pool.query(`
      SELECT 
        genero,
        COUNT(*) as cantidad,
        AVG(EXTRACT(YEAR FROM AGE(fecha_nacimiento))) as edad_promedio,
        MIN(EXTRACT(YEAR FROM AGE(fecha_nacimiento))) as edad_minima,
        MAX(EXTRACT(YEAR FROM AGE(fecha_nacimiento))) as edad_maxima
      FROM personas
      WHERE genero IS NOT NULL AND fecha_nacimiento IS NOT NULL
      GROUP BY genero
      ORDER BY cantidad DESC
    `);

    const ageGroups = await this.pool.query(`
      SELECT 
        genero,
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 25 THEN '18-24'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 35 THEN '25-34'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 45 THEN '35-44'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 55 THEN '45-54'
          ELSE '55+'
        END as grupo_edad,
        COUNT(*) as cantidad
      FROM personas
      WHERE genero IS NOT NULL AND fecha_nacimiento IS NOT NULL
      GROUP BY genero, grupo_edad
      ORDER BY genero, grupo_edad
    `);

    return {
      stats: {
        por_genero: genderStats.rows,
        grupos_edad_genero: ageGroups.rows
      },
      query_type: 'demographic_analysis',
      success: true
    };
  }

  /**
   * Ejecuta filtros complejos combinados
   */
  async executeComplexFilter(parameters) {
    const { whereClause, params } = this.buildWhereClause(parameters);
    
    const query = `
      SELECT *, 
             EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad,
             CASE 
               WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 30 THEN 'Joven'
               WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 50 THEN 'Adulto'
               ELSE 'Mayor'
             END as categoria_edad
      FROM personas 
      ${whereClause}
      ORDER BY fecha_nacimiento DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query, params);

    return {
      data: result.rows,
      count: result.rows.length,
      query_type: 'complex_filter',
      filters_applied: parameters,
      success: true,
      has_results: result.rows.length > 0
    };
  }

  /**
   * Ejecuta búsqueda semántica combinada con SQL
   */
  async executeSemanticSearch(queryIntent, embeddingsManager) {
    const { original_query, parameters } = queryIntent;
    
    try {
      // Intentar búsqueda vectorial
      if (embeddingsManager) {
        const vectorResults = await embeddingsManager.searchSimilarPersonas(
          original_query, 
          {
            limit: 20,
            scoreThreshold: 0.3,
            filters: this.extractFiltersForVector(parameters)
          }
        );

        if (vectorResults.length > 0) {
          const ids = vectorResults.map(r => r.id);
          const query = `
            SELECT *, 
                   EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
            FROM personas 
            WHERE id = ANY($1::int[])
            ORDER BY primer_nombre, apellidos
          `;

          const result = await this.pool.query(query, [ids]);
          
          return {
            data: result.rows,
            count: result.rows.length,
            query_type: 'semantic_search',
            vector_scores: vectorResults.map(r => ({ id: r.id, score: r.score })),
            success: true,
            has_results: result.rows.length > 0
          };
        }
      }
    } catch (error) {
      console.log('⚠️ Búsqueda vectorial no disponible, usando fallback SQL');
    }

    // Fallback: búsqueda SQL tradicional
    const { whereClause, params } = this.buildWhereClause(parameters);
    
    const fallbackQuery = `
      SELECT *, 
             EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
      FROM personas 
      ${whereClause}
      ORDER BY primer_nombre, apellidos
      LIMIT 50
    `;

    const result = await this.pool.query(fallbackQuery, params);

    return {
      data: result.rows,
      count: result.rows.length,
      query_type: 'semantic_search_fallback',
      success: true,
      has_results: result.rows.length > 0
    };
  }

  /**
   * Ejecuta consultas estructuradas con formato específico
   */
  async executeStructuredListQuery(parameters) {
    try {
      // Campos por defecto si no se especifican
      const defaultFields = ['primer_nombre', 'segundo_nombre', 'apellidos', 'numero_documento', 'tipo_documento', 'edad'];
      const selectedFields = parameters.selected_fields || defaultFields;
      
      // Validar campos seleccionados
      const validSelectedFields = selectedFields.filter(field => 
        this.validColumns.includes(field) || field === 'edad'
      );
      
      if (validSelectedFields.length === 0) {
        throw new Error('No se especificaron campos válidos para la consulta');
      }

      // Construir SELECT con campos específicos
      let selectClause = validSelectedFields.map(field => {
        if (field === 'edad') {
          return 'EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad';
        }
        return field;
      }).join(', ');

      // Construir condiciones WHERE
      const conditions = ['1=1'];
      const params = [];
      let paramIndex = 1;

      // Filtro por contenido de nombre (cualquier campo de nombre)
      if (parameters.name_contains) {
        const nameConditions = [
          `primer_nombre ILIKE $${paramIndex}`,
          `segundo_nombre ILIKE $${paramIndex}`,
          `apellidos ILIKE $${paramIndex}`
        ];
        conditions.push(`(${nameConditions.join(' OR ')})`);
        params.push(`%${parameters.name_contains}%`);
        paramIndex++;
      }

      // Filtros de edad
      if (parameters.edad_min !== undefined) {
        conditions.push(`EXTRACT(YEAR FROM AGE(fecha_nacimiento)) >= $${paramIndex}`);
        params.push(parameters.edad_min);
        paramIndex++;
      }

      if (parameters.edad_max !== undefined) {
        conditions.push(`EXTRACT(YEAR FROM AGE(fecha_nacimiento)) <= $${paramIndex}`);
        params.push(parameters.edad_max);
        paramIndex++;
      }

      // Filtros adicionales por género, documento, etc.
      const exactMatchFields = ['genero', 'tipo_documento', 'numero_documento'];
      exactMatchFields.forEach(field => {
        if (parameters[field]) {
          conditions.push(`${field} = $${paramIndex}`);
          params.push(parameters[field]);
          paramIndex++;
        }
      });

      // Construir ORDER BY
      let orderClause = '';
      if (parameters.order_by) {
        const validOrderFields = ['edad', 'primer_nombre', 'apellidos', 'fecha_nacimiento'];
        if (validOrderFields.includes(parameters.order_by)) {
          const orderField = parameters.order_by === 'edad' ? 
            'EXTRACT(YEAR FROM AGE(fecha_nacimiento))' : parameters.order_by;
          const direction = parameters.order_direction === 'DESC' ? 'DESC' : 'ASC';
          orderClause = `ORDER BY ${orderField} ${direction}`;
        }
      }

      // Construir consulta completa
      const query = `
        SELECT ${selectClause}
        FROM personas
        WHERE ${conditions.join(' AND ')}
        ${orderClause}
        LIMIT 100
      `.trim();

      console.log('🔍 Executing structured query:', query);
      console.log('📊 Parameters:', params);

      const result = await this.pool.query(query, params);
      
      // Formatear datos para presentación estructurada
      const formattedData = result.rows.map(row => {
        const formatted = {};
        validSelectedFields.forEach(field => {
          if (field === 'edad') {
            formatted.edad = parseInt(row.edad || 0);
          } else {
            formatted[field] = row[field];
          }
        });
        return formatted;
      });

      return {
        data: formattedData,
        count: result.rows.length,
        query_type: 'structured_list',
        selected_fields: validSelectedFields,
        order_by: parameters.order_by,
        filters_applied: {
          name_contains: parameters.name_contains,
          edad_min: parameters.edad_min,
          edad_max: parameters.edad_max,
          genero: parameters.genero
        },
        include_total: parameters.include_total || false,
        success: true
      };

    } catch (error) {
      console.error('❌ Error en consulta estructurada:', error);
      throw error;
    }
  }

  /**
   * Construye cláusula WHERE dinámica
   */
  buildWhereClause(parameters) {
    const conditions = ['1=1'];
    const params = [];
    let paramIndex = 1;

    // Filtros de edad
    if (parameters.edad_min !== undefined) {
      conditions.push(`EXTRACT(YEAR FROM AGE(fecha_nacimiento)) >= $${paramIndex}`);
      params.push(parameters.edad_min);
      paramIndex++;
    }

    if (parameters.edad_max !== undefined) {
      conditions.push(`EXTRACT(YEAR FROM AGE(fecha_nacimiento)) <= $${paramIndex}`);
      params.push(parameters.edad_max);
      paramIndex++;
    }

    // Filtros de campos específicos
    const exactMatchFields = ['genero', 'tipo_documento', 'numero_documento', 'celular'];
    const likeMatchFields = ['primer_nombre', 'segundo_nombre', 'apellidos', 'correo_electronico'];

    exactMatchFields.forEach(field => {
      if (parameters[field]) {
        conditions.push(`${field} = $${paramIndex}`);
        params.push(parameters[field]);
        paramIndex++;
      }
    });

    likeMatchFields.forEach(field => {
      if (parameters[field]) {
        conditions.push(`${field} ILIKE $${paramIndex}`);
        params.push(`%${parameters[field]}%`);
        paramIndex++;
      }
    });

    return {
      whereClause: conditions.length > 1 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }

  /**
   * Extrae filtros compatibles con búsqueda vectorial
   */
  extractFiltersForVector(parameters) {
    const vectorFilters = {};
    
    if (parameters.genero) vectorFilters.genero = parameters.genero;
    if (parameters.tipo_documento) vectorFilters.tipo_documento = parameters.tipo_documento;
    
    return Object.keys(vectorFilters).length > 0 ? vectorFilters : null;
  }
}

module.exports = SQLQueryEngine;