/**
 * Motor de procesamiento de consultas en lenguaje natural
 * Utiliza Gemini AI para interpretar intenciones y generar respuestas contextuales
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class QueryProcessor {
  constructor(config = {}) {
    this.genAI = new GoogleGenerativeAI(config.apiKey || process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.model || "gemini-1.5-flash" 
    });
    this.maxRetries = config.maxRetries || 2;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Clasifica una consulta y extrae parámetros usando IA avanzada
   */
  async classifyQuery(query, retryCount = 0) {
    try {
      const prompt = this.buildClassificationPrompt(query);
      
      const intentResponse = await this.model.generateContent(prompt);
      const responseText = intentResponse.response.text();
      
      // Extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{.*\}/s);
      if (jsonMatch) {
        const parsedIntent = JSON.parse(jsonMatch[0]);
        return this.validateAndEnrichIntent(parsedIntent, query);
      }
      
      // Fallback si no se puede parsear
      return this.classifyQueryFallback(query);
    } catch (error) {
      if (retryCount < this.maxRetries && (error.message.includes('429') || error.message.includes('503'))) {
        console.log(`⚠️ Error temporal de API, reintentando en ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.classifyQuery(query, retryCount + 1);
      }
      
      console.log('🔄 Usando clasificación local por error de API:', error.message);
      return this.classifyQueryFallback(query);
    }
  }

  /**
   * Construye el prompt de clasificación avanzado
   */
  buildClassificationPrompt(query) {
    return `Eres un experto en análisis de consultas sobre una base de datos de empleados/personas.

ESQUEMA DE LA BASE DE DATOS:
- id: identificador único
- primer_nombre: primer nombre de la persona
- segundo_nombre: segundo nombre (opcional)
- apellidos: apellidos de la persona
- numero_documento: número de documento de identidad
- tipo_documento: tipo de documento (Cédula, Pasaporte, etc.)
- fecha_nacimiento: fecha de nacimiento (YYYY-MM-DD)
- edad: edad calculada en años
- genero: género (Masculino, Femenino, No binario)
- correo_electronico: email de la persona
- celular: número de teléfono móvil

TIPOS DE CONSULTA SOPORTADOS:
1. "demographic_analysis" - Análisis demográfico (distribución por edad, género, etc.)
2. "search_semantic" - Búsqueda semántica usando embeddings vectoriales
3. "search_direct" - Búsqueda directa por campos específicos
4. "statistical_query" - Consultas estadísticas (promedios, totales, etc.)
5. "comparative_query" - Consultas comparativas (más joven, más viejo, etc.)
6. "counting_query" - Contar personas con criterios específicos
7. "name_pattern_search" - Búsqueda por patrones en nombres
8. "contact_search" - Búsqueda por información de contacto
9. "document_search" - Búsqueda por tipo/número de documento
10. "age_range_query" - Consultas por rangos de edad
11. "complex_filter" - Filtros complejos con múltiples criterios
12. "structured_list_query" - Lista estructurada con campos específicos, ordenamiento y formato personalizado
13. "security_blocked" - Consultas sobre sistema/seguridad (bloqueadas)

INSTRUCCIONES:
1. Analiza la consulta y determina el tipo más específico
2. Extrae todos los parámetros relevantes
3. Para rangos de edad, convierte términos como "jóvenes" a rangos numéricos
4. Para géneros, normaliza a: "Masculino", "Femenino", "No binario"
5. Para nombres, identifica si es búsqueda por patrón o exacta
6. Detecta consultas de seguridad y bloquéalas

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE en formato JSON:
{
  "intent": "tipo_consulta",
  "parameters": {
    "campo": "valor",
    "edad_min": número_opcional,
    "edad_max": número_opcional,
    "search_terms": ["términos", "de", "búsqueda"],
    "filters": { "campo": "valor" }
  },
  "confidence": 0.95,
  "complexity": "simple|medium|complex",
  "requires_semantic_search": true/false
}

EJEMPLOS:
Consulta: "personas jóvenes que trabajen en tecnología"
Respuesta: {
  "intent": "search_semantic", 
  "parameters": {"edad_max": 30, "search_terms": ["jóvenes", "tecnología"]}, 
  "confidence": 0.9, 
  "complexity": "medium", 
  "requires_semantic_search": true
}

Consulta: "cuántas mujeres de entre 25 y 40 años"
Respuesta: {
  "intent": "counting_query", 
  "parameters": {"genero": "Femenino", "edad_min": 25, "edad_max": 40}, 
  "confidence": 0.95, 
  "complexity": "medium", 
  "requires_semantic_search": false
}

Consulta: "dame un listado ordenado por edad de empleados cuyo nombre contenga quisa, sean mayores de 2 años, con nombre, cedula y edad"
Respuesta: {
  "intent": "structured_list_query",
  "parameters": {
    "name_contains": "quisa", 
    "edad_min": 2,
    "order_by": "edad",
    "order_direction": "ASC",
    "selected_fields": ["primer_nombre", "segundo_nombre", "apellidos", "numero_documento", "tipo_documento", "edad"],
    "include_total": true
  },
  "confidence": 0.95,
  "complexity": "complex",
  "requires_semantic_search": false
}

CONSULTA A ANALIZAR: "${query}"

Respuesta JSON:`;
  }

  /**
   * Valida y enriquece la intención clasificada
   */
  validateAndEnrichIntent(intent, originalQuery) {
    // Validar que tenga los campos requeridos
    if (!intent.intent) {
      intent.intent = 'search_semantic';
    }
    
    if (!intent.parameters) {
      intent.parameters = {};
    }
    
    if (!intent.confidence) {
      intent.confidence = 0.7;
    }
    
    if (!intent.complexity) {
      intent.complexity = 'medium';
    }
    
    if (intent.requires_semantic_search === undefined) {
      intent.requires_semantic_search = ['search_semantic', 'complex_filter'].includes(intent.intent);
    }

    // Enriquecer con información adicional
    intent.original_query = originalQuery;
    intent.timestamp = new Date().toISOString();
    
    return intent;
  }

  /**
   * Clasificación de respaldo usando reglas heurísticas
   */
  classifyQueryFallback(query) {
    const lowerQuery = query.toLowerCase().trim();
    
    // Detectar consultas de seguridad
    const securityKeywords = ['.env', 'variable', 'configuración', 'config', 'password', 'secret', 'token', 'api_key'];
    if (securityKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        intent: 'security_blocked',
        parameters: {},
        confidence: 1.0,
        complexity: 'simple',
        requires_semantic_search: false,
        original_query: query
      };
    }

    // Patrones de edad
    const agePatterns = {
      'joven|jóvenes|joven adulto': { edad_max: 30 },
      'adulto mayor|mayor|mayores': { edad_min: 50 },
      'tercera edad|senior|ancianos': { edad_min: 65 },
      'menor de edad|menores': { edad_max: 17 },
      'adulto|adultos': { edad_min: 18, edad_max: 49 }
    };

    // Patrones de género
    const genderPatterns = {
      'mujer|mujeres|femenino|femenina': 'Femenino',
      'hombre|hombres|masculino|masculina': 'Masculino',
      'no binario|no-binario|nobinario': 'No binario'
    };

    // Analizar tipo de consulta
    let intent = 'search_semantic';
    let parameters = {};
    let complexity = 'simple';

    // Detectar consultas estructuradas con listado específico
    if (/listado|lista.*ordenad|dame.*list|mostrar.*list/i.test(lowerQuery) && 
        (/únicamente|solamente|solo.*información|campos específicos|debe tener/i.test(lowerQuery))) {
      intent = 'structured_list_query';
      complexity = 'complex';
      
      // Detectar campos específicos mencionados
      const fieldMentions = {
        'nombre': ['primer_nombre', 'segundo_nombre', 'apellidos'],
        'cedula|cédula|documento': ['numero_documento', 'tipo_documento'],
        'edad': ['edad'],
        'correo|email': ['correo_electronico'],
        'celular|teléfono': ['celular'],
        'género|genero': ['genero']
      };
      
      let selectedFields = [];
      Object.entries(fieldMentions).forEach(([pattern, fields]) => {
        if (new RegExp(pattern, 'i').test(lowerQuery)) {
          selectedFields = selectedFields.concat(fields);
        }
      });
      
      if (selectedFields.length > 0) {
        parameters.selected_fields = selectedFields;
      }
      
      // Detectar ordenamiento
      if (/ordenad.*edad|por edad/i.test(lowerQuery)) {
        parameters.order_by = 'edad';
        parameters.order_direction = /descendente|mayor.*menor/i.test(lowerQuery) ? 'DESC' : 'ASC';
      }
      
      // Detectar si pide total
      if (/total.*personas|total.*lista|cuántos.*total/i.test(lowerQuery)) {
        parameters.include_total = true;
      }
      
      // Detectar filtros por nombre
      const nameContainsMatch = lowerQuery.match(/nombre.*content.*["\']([^"']+)["\']|contenga.*["\']([^"']+)["\']|nombre.*["\']([^"']+)["\']/i);
      if (nameContainsMatch) {
        parameters.name_contains = nameContainsMatch[1] || nameContainsMatch[2] || nameContainsMatch[3];
      } else if (/contenga.*quisa|nombre.*quisa/i.test(lowerQuery)) {
        parameters.name_contains = 'quisa';
      }
    }
    
    // Consultas de conteo
    else if (/cuántas?|cuantas?|contar|número de|total de/.test(lowerQuery)) {
      intent = 'counting_query';
    }
    
    // Consultas comparativas
    else if (/más joven|menor edad|youngest/.test(lowerQuery)) {
      intent = 'comparative_query';
      parameters.comparison_type = 'youngest';
    }
    else if (/más viejo|más vieja|mayor edad|oldest/.test(lowerQuery)) {
      intent = 'comparative_query';
      parameters.comparison_type = 'oldest';
    }
    
    // Estadísticas
    else if (/estadística|estadísticas|promedio|media|distribución/.test(lowerQuery)) {
      intent = 'statistical_query';
    }
    
    // Patrones de nombres
    else if (/empie[cz]|comien[cz]|nombre.*inicia|nombre.*empieza/.test(lowerQuery)) {
      intent = 'name_pattern_search';
      const letterMatch = lowerQuery.match(/empie[cz]an?\s+con\s+([a-z])/i);
      if (letterMatch) {
        parameters.letter = letterMatch[1].toUpperCase();
        parameters.field = 'primer_nombre';
      }
    }
    
    // Búsqueda directa por campos
    else if (/apellido|documento|cedula|pasaporte|email|correo|celular|teléfono/.test(lowerQuery)) {
      intent = 'search_direct';
      complexity = 'medium';
    }

    // Extraer parámetros de edad
    Object.entries(agePatterns).forEach(([pattern, ageParams]) => {
      if (new RegExp(pattern, 'i').test(lowerQuery)) {
        Object.assign(parameters, ageParams);
      }
    });

    // Extraer parámetros de género
    Object.entries(genderPatterns).forEach(([pattern, gender]) => {
      if (new RegExp(pattern, 'i').test(lowerQuery)) {
        parameters.genero = gender;
      }
    });

    // Extraer números para rangos de edad específicos
    const ageNumbers = lowerQuery.match(/\d+/g);
    if (ageNumbers) {
      const nums = ageNumbers.map(n => parseInt(n)).filter(n => n > 0 && n < 120);
      if (nums.length === 1) {
        if (/mayor.*\d+|más.*\d+|de.*\d+.*arriba/.test(lowerQuery)) {
          parameters.edad_min = nums[0];
        } else if (/menor.*\d+|menos.*\d+|de.*\d+.*abajo/.test(lowerQuery)) {
          parameters.edad_max = nums[0];
        }
      } else if (nums.length >= 2) {
        parameters.edad_min = Math.min(...nums);
        parameters.edad_max = Math.max(...nums);
      }
    }

    return {
      intent,
      parameters,
      confidence: 0.6,
      complexity,
      requires_semantic_search: intent === 'search_semantic',
      original_query: query,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Genera una respuesta contextual usando IA
   */
  async generateResponse(queryIntent, queryResult, retryCount = 0) {
    try {
      const prompt = this.buildResponsePrompt(queryIntent, queryResult);
      
      const response = await this.model.generateContent(prompt);
      const responseText = response.response.text().trim();
      
      return this.processGeneratedResponse(responseText, queryResult);
    } catch (error) {
      if (retryCount < this.maxRetries && (error.message.includes('429') || error.message.includes('503'))) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.generateResponse(queryIntent, queryResult, retryCount + 1);
      }
      
      // Fallback: generar respuesta simple
      return this.generateFallbackResponse(queryIntent, queryResult);
    }
  }

  /**
   * Construye el prompt para generar respuestas
   */
  buildResponsePrompt(queryIntent, queryResult) {
    const { intent, parameters, original_query } = queryIntent;
    const { data, count, stats, error } = queryResult;

    return `Eres un asistente experto que interpreta resultados de consultas sobre empleados/personas.

CONSULTA ORIGINAL: "${original_query}"
TIPO DE CONSULTA: ${intent}
PARÁMETROS: ${JSON.stringify(parameters)}

DATOS OBTENIDOS: ${JSON.stringify(data ? (Array.isArray(data) ? data.slice(0, 5) : data) : null)}
ESTADÍSTICAS: ${JSON.stringify(stats || {})}
ERROR: ${error || 'ninguno'}

INSTRUCCIONES:
1. Genera una respuesta natural y profesional en español
2. Sé específico con números y datos concretos
3. Si hay muchos resultados, resume los más relevantes
4. **Si NO hay resultados (count=0 o data vacío), proporciona sugerencias útiles**
5. Usa un tono conversacional pero informativo
6. Mantén la respuesta concisa (máximo 3 párrafos)
7. Include insights interesantes cuando sea relevante

EJEMPLOS DE RESPUESTAS:
- Para conteos: "Encontré X personas que cumplen tus criterios..."
- Para búsquedas: "He identificado las siguientes personas que coinciden..."
- Para estadísticas: "Según los datos, el promedio de edad es..."
- Para comparaciones: "La persona más joven/mayor es..."
- Para listados estructurados: "Aquí tienes el listado ordenado según tus criterios: [presentar datos de forma clara y organizada]. Total de personas en la lista: X"
- **Para SIN RESULTADOS**: "🔍 No se encontraron personas que coincidan con [criterio]. 💡 Sugerencias: [sugerir alternativas como ampliar búsqueda, verificar ortografía, etc.]"

FORMATO ESPECIAL PARA LISTADOS ESTRUCTURADOS:
Si el tipo de consulta es "structured_list_query", presenta los datos en formato de lista organizada, mostrando claramente cada campo solicitado y termina siempre con el total de personas.

RESPUESTA:`;
  }

  /**
   * Procesa la respuesta generada por IA
   */
  processGeneratedResponse(responseText, queryResult) {
    // Limpiar la respuesta
    let cleanResponse = responseText
      .replace(/^(RESPUESTA:|Respuesta:)/i, '')
      .trim();
    
    // Validar longitud
    if (cleanResponse.length < 10) {
      return this.generateFallbackResponse(null, queryResult);
    }
    
    // Validar que no contenga información sensible
    const securityKeywords = ['api_key', 'password', '.env', 'secret'];
    if (securityKeywords.some(keyword => cleanResponse.toLowerCase().includes(keyword))) {
      return 'No puedo proporcionar información sobre configuraciones del sistema por seguridad.';
    }

    return cleanResponse;
  }

  /**
   * Genera respuesta de respaldo cuando falla la IA
   */
  generateFallbackResponse(queryIntent, queryResult) {
    const { intent } = queryIntent || {};
    const { data, count, stats, query_type, include_total, has_results } = queryResult;
    
    // Manejo especial para consultas estructuradas
    if (intent === 'structured_list_query' || query_type === 'structured_list') {
      return this.generateStructuredListResponse(data, count, include_total);
    }
    
    // Manejo específico para casos sin resultados
    if (count !== undefined && count === 0) {
      return this.generateNoResultsMessage(queryIntent, queryResult);
    }
    
    if (count !== undefined) {
      return `Se encontraron ${count} persona(s) que cumplen con los criterios especificados.`;
    }
    
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return this.generateNoResultsMessage(queryIntent, queryResult);
      } else if (data.length === 1) {
        const persona = data[0];
        return `Se encontró a ${persona.primer_nombre} ${persona.apellidos}${persona.edad ? ` de ${persona.edad} años` : ''}.`;
      } else {
        return `Se encontraron ${data.length} personas. Las primeras son: ${data.slice(0, 3).map(p => `${p.primer_nombre} ${p.apellidos}`).join(', ')}.`;
      }
    }
    
    if (data && typeof data === 'object') {
      return `Se encontró información para ${data.primer_nombre || 'la persona'} ${data.apellidos || 'solicitada'}.`;
    }

    return 'Se procesó tu consulta correctamente.';
  }

  /**
   * Genera un mensaje apropiado cuando no hay resultados
   */
  generateNoResultsMessage(queryIntent, queryResult) {
    const { intent, parameters, original_query } = queryIntent || {};
    const { query_type } = queryResult || {};

    let message = '🔍 **No se encontraron resultados** que coincidan con tu búsqueda.';

    // Sugerencias específicas según el tipo de consulta
    if (intent === 'name_pattern_search' || intent === 'search_direct') {
      message += '\n\n💡 **Sugerencias:**\n';
      message += '• Verifica la ortografía de los nombres o términos de búsqueda\n';
      message += '• Intenta buscar con menos filtros o criterios más amplios\n';
      message += '• Usa términos de búsqueda más generales (ej: "María" en lugar de "María José")';
    }
    else if (intent === 'counting_query') {
      message += '\n\n📊 El conteo para los criterios especificados es **0**.';
      message += '\n\n💡 **Sugerencias:**\n';
      message += '• Amplía los rangos de edad o criterios de búsqueda\n';
      message += '• Verifica que los filtros aplicados no sean demasiado restrictivos';
    }
    else if (intent === 'age_range_query') {
      const { edad_min, edad_max } = parameters || {};
      if (edad_min || edad_max) {
        message += `\n\n📈 No hay personas registradas en el rango de edad especificado${edad_min ? ` (${edad_min}+ años)` : ''}${edad_max ? ` (hasta ${edad_max} años)` : ''}.`;
        message += '\n\n💡 **Sugerencias:**\n';
        message += '• Amplía el rango de edades\n';
        message += '• Consulta las edades disponibles en la base de datos con: "¿qué edades hay registradas?"';
      }
    }
    else if (intent === 'structured_list_query') {
      const { name_contains, order_by } = parameters || {};
      if (name_contains) {
        message += `\n\n🔤 No se encontraron personas con nombres que contengan "${name_contains}".`;
        message += '\n\n💡 **Sugerencias:**\n';
        message += '• Verifica la ortografía del término de búsqueda\n';
        message += '• Intenta buscar con una parte más pequeña del nombre\n';
        message += '• Prueba con "lista de todos los empleados" para ver todos los registros disponibles';
      }
    }
    else if (intent === 'comparative_query') {
      message += '\n\n⚠️ No se pudieron realizar comparaciones con los datos disponibles.';
      message += '\n\n💡 **Sugerencias:**\n';
      message += '• Verifica que existan personas registradas en el sistema\n';
      message += '• Intenta preguntar: "¿cuántas personas están registradas?"';
    }
    
    // Sugerencias generales adicionales
    message += '\n\n🔧 **Otras opciones:**\n';
    message += '• Consulta el total de personas registradas: "¿cuántas personas hay?"\n';
    message += '• Ve todos los empleados disponibles: "muestra todos los empleados"\n';
    message += '• Obtén estadísticas generales: "estadísticas de empleados"';

    return message;
  }

  /**
   * Genera respuesta estructurada para listados específicos
   */
  generateStructuredListResponse(data, count, includeTotal = false) {
    if (!Array.isArray(data) || data.length === 0) {
      return '📋 **No se encontraron personas** que coincidan con los criterios del listado solicitado.\n\n💡 **Sugerencias:**\n• Verifica los filtros aplicados (nombres, edad, etc.)\n• Intenta con criterios menos específicos\n• Consulta primero: "¿cuántas personas hay registradas?"';
    }

    let response = 'Aquí tienes el listado solicitado:\n\n';
    
    data.forEach((persona, index) => {
      const nombreCompleto = `${persona.primer_nombre || ''} ${persona.segundo_nombre || ''} ${persona.apellidos || ''}`.trim();
      const documento = persona.tipo_documento && persona.numero_documento ? 
        `${persona.tipo_documento}: ${persona.numero_documento}` : 'Documento no disponible';
      const edad = persona.edad ? `${persona.edad} años` : 'Edad no disponible';
      
      response += `${index + 1}. ${nombreCompleto}\n`;
      response += `   • ${documento}\n`;
      response += `   • Edad: ${edad}\n\n`;
    });

    if (includeTotal || count !== undefined) {
      response += `Total de personas en la lista: ${count || data.length}`;
    }

    return response;
  }
}

module.exports = QueryProcessor;