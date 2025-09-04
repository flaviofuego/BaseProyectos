const express = require('express');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { QdrantClient } = require('@qdrant/js-client-rest');
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Google Gemini configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// Qdrant vector database client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://qdrant:6333'
});

const COLLECTION_NAME = 'personas_embeddings';

// Initialize vector collection
async function initializeVectorDB() {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    
    if (!exists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 768, // Gemini embedding dimension
          distance: 'Cosine'
        }
      });
      console.log('Vector collection created');
    }
  } catch (error) {
    console.error('Error initializing vector DB:', error);
  }
}

// Generate embedding for text using Gemini
async function generateEmbedding(text) {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Update embeddings for a persona
async function updatePersonaEmbedding(persona) {
  try {
    // Create text representation of persona
    const personaText = `
      Nombre: ${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos}
      Documento: ${persona.tipo_documento} ${persona.numero_documento}
      Fecha de nacimiento: ${persona.fecha_nacimiento}
      Edad: ${persona.edad || 'No calculada'} años
      Género: ${persona.genero}
      Email: ${persona.correo_electronico}
      Celular: ${persona.celular}
    `.trim();

    // Generate embedding
    const embedding = await generateEmbedding(personaText);

    // Store in Qdrant
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: persona.id,
          vector: embedding,
          payload: {
            numero_documento: persona.numero_documento,
            nombre_completo: `${persona.primer_nombre} ${persona.segundo_nombre || ''} ${persona.apellidos}`.trim(),
            edad: persona.edad,
            genero: persona.genero,
            tipo_documento: persona.tipo_documento
          }
        }
      ]
    });
  } catch (error) {
    console.error('Error updating persona embedding:', error);
  }
}

// Search similar personas using embeddings
async function searchSimilarPersonas(query, limit = 5) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    const searchResult = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: limit,
      with_payload: true
    });

    return searchResult;
  } catch (error) {
    console.log('Vector search not available, using fallback search');
    return []; // Return empty array as fallback
  }
}

// Fallback query classification (when Gemini is not available)
function classifyQueryFallback(query) {
  const lowerQuery = query.toLowerCase();
  
  // Check for system/security queries first
  if (lowerQuery.includes('.env') || lowerQuery.includes('variable') || lowerQuery.includes('configuración')) {
    return { intent: 'security_blocked', parameters: {} };
  }
  
  // Check for common patterns
  if (lowerQuery.includes('más joven') || lowerQuery.includes('menor edad')) {
    return { intent: 'youngest', parameters: {} };
  }
  
  if (lowerQuery.includes('más viejo') || lowerQuery.includes('más vieja') || lowerQuery.includes('mayor edad')) {
    return { intent: 'oldest', parameters: {} };
  }
  
  if (lowerQuery.includes('cuántas') || lowerQuery.includes('cuantas') || lowerQuery.includes('contar')) {
    return { intent: 'count', parameters: {} };
  }
  
  if (lowerQuery.includes('estadística') || lowerQuery.includes('estadisticas') || lowerQuery.includes('total')) {
    return { intent: 'stats', parameters: {} };
  }
  
  if (lowerQuery.includes('empiec') || lowerQuery.includes('empiez')) {
    // Extract letter from query
    const letterMatch = lowerQuery.match(/empiec[ae]n?\s+con\s+([a-z])/i);
    if (letterMatch) {
      return { 
        intent: 'name_starts_with', 
        parameters: { letter: letterMatch[1].toUpperCase(), field: 'primer_nombre' }
      };
    }
  }
  
  // Default to search for most queries
  return { intent: 'search', parameters: {} };
}

// Process natural language query
async function processNLQuery(query) {
  try {
    // Try to classify the query using simple rules first (fallback)
    let intent = classifyQueryFallback(query);
    
    // If we have Gemini available and it's not a quota error, try to use it
    try {
      const prompt = `Eres un asistente que ayuda a interpretar consultas sobre personas en una base de datos.
Las personas tienen los siguientes campos: primer_nombre, segundo_nombre, apellidos, numero_documento, tipo_documento, edad, genero, correo_electronico, celular.
Debes identificar qué tipo de consulta es y extraer los parámetros relevantes.
Responde ÚNICAMENTE en formato JSON con la estructura: { "intent": "tipo_consulta", "parameters": {...} }

Tipos de consulta posibles:
- "youngest": buscar la persona más joven
- "oldest": buscar la persona más vieja  
- "count": contar personas con ciertos criterios
- "search": buscar personas por criterios específicos usando búsqueda semántica
- "stats": obtener estadísticas generales
- "name_starts_with": buscar personas cuyo nombre empiece con una letra o string específico
- "direct_search": búsqueda directa por campos específicos (nombre, apellido, documento, etc.)

Ejemplos:
- "dame la lista de personas que su nombre empiece con F" → {"intent": "name_starts_with", "parameters": {"letter": "F", "field": "primer_nombre"}}
- "personas con apellido García" → {"intent": "direct_search", "parameters": {"apellidos": "García"}}
- "busca personas mayores de 30 años" → {"intent": "direct_search", "parameters": {"edad_min": 30}}
- "cuántas mujeres hay" → {"intent": "count", "parameters": {"genero": "Femenino"}}

Consulta: ${query}

Respuesta JSON:`;

      const intentResponse = await model.generateContent(prompt);
      const responseText = intentResponse.response.text();
      
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{.*\}/s);
      if (jsonMatch) {
        intent = JSON.parse(jsonMatch[0]);
      }
    } catch (geminiError) {
      console.log('Usando clasificación local (Gemini no disponible):', geminiError.message);
      // Usar el intent del fallback
    }

    // Execute query based on intent
    let result;
    switch (intent.intent) {
      case 'security_blocked':
        return {
          answer: 'Lo siento, no puedo proporcionar información sobre configuraciones del sistema o variables de entorno por razones de seguridad. Solo puedo ayudarte con consultas sobre las personas registradas en la base de datos.',
          data: null,
          intent: intent
        };

      case 'youngest':
        result = await pool.query(`
          SELECT *, EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
          FROM personas
          ORDER BY fecha_nacimiento DESC
          LIMIT 1
        `);
        return {
          answer: result.rows[0] ? 
            `La persona más joven registrada es ${result.rows[0].primer_nombre} ${result.rows[0].apellidos}, con ${result.rows[0].edad} años.` :
            'No se encontraron personas registradas.',
          data: result.rows[0] || null,
          intent: intent
        };

      case 'oldest':
        result = await pool.query(`
          SELECT *, EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
          FROM personas
          ORDER BY fecha_nacimiento ASC
          LIMIT 1
        `);
        return {
          answer: result.rows[0] ? 
            `La persona más vieja registrada es ${result.rows[0].primer_nombre} ${result.rows[0].apellidos}, con ${result.rows[0].edad} años.` :
            'No se encontraron personas registradas.',
          data: result.rows[0] || null,
          intent: intent
        };

      case 'count':
        let countQuery = 'SELECT COUNT(*) FROM personas WHERE 1=1';
        const countParams = [];
        let paramIndex = 1;

        if (intent.parameters.genero) {
          countQuery += ` AND genero = $${paramIndex}`;
          countParams.push(intent.parameters.genero);
          paramIndex++;
        }

        if (intent.parameters.tipo_documento) {
          countQuery += ` AND tipo_documento = $${paramIndex}`;
          countParams.push(intent.parameters.tipo_documento);
          paramIndex++;
        }

        result = await pool.query(countQuery, countParams);
        return {
          answer: `Se encontraron ${result.rows[0].count} personas con los criterios especificados.`,
          data: { count: parseInt(result.rows[0].count) },
          intent: intent
        };

      case 'search':
        // Use vector search for semantic queries
        const searchResults = await searchSimilarPersonas(query);
        
        if (searchResults.length > 0) {
          // Get full data for top results
          const ids = searchResults.map(r => r.id);
          result = await pool.query(
            'SELECT *, EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad FROM personas WHERE id = ANY($1::int[])',
            [ids]
          );

          return {
            answer: `Encontré ${result.rows.length} personas que coinciden con tu búsqueda.`,
            data: result.rows,
            intent: intent,
            similarity_scores: searchResults.map(r => ({ id: r.id, score: r.score }))
          };
        } else {
          // Fallback: return all persons when vector search fails
          result = await pool.query(`
            SELECT *, EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad 
            FROM personas 
            ORDER BY primer_nombre, apellidos
          `);
          
          return {
            answer: `Búsqueda general: encontré ${result.rows.length} personas registradas en el sistema.`,
            data: result.rows,
            intent: intent
          };
        }

      case 'stats':
        const stats = await pool.query(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN genero = 'Masculino' THEN 1 END) as masculino,
            COUNT(CASE WHEN genero = 'Femenino' THEN 1 END) as femenino,
            COUNT(CASE WHEN genero = 'No binario' THEN 1 END) as no_binario,
            AVG(EXTRACT(YEAR FROM AGE(fecha_nacimiento))) as edad_promedio
          FROM personas
        `);

        const statsData = stats.rows[0];
        return {
          answer: `En el sistema hay ${statsData.total} personas registradas. 
                   ${statsData.masculino} son masculinos, ${statsData.femenino} son femeninos, 
                   y ${statsData.no_binario} se identifican como no binario. 
                   La edad promedio es de ${Math.round(statsData.edad_promedio)} años.`,
          data: statsData,
          intent: intent
        };

      case 'name_starts_with':
        const letter = intent.parameters.letter || '';
        const field = intent.parameters.field || 'primer_nombre';
        
        result = await pool.query(`
          SELECT *, EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
          FROM personas 
          WHERE ${field} ILIKE $1
          ORDER BY ${field}, apellidos
        `, [`${letter}%`]);

        if (result.rows.length > 0) {
          return {
            answer: `Encontré ${result.rows.length} persona(s) cuyo ${field} empieza con "${letter}": ${result.rows.map(p => `${p.primer_nombre} ${p.segundo_nombre || ''} ${p.apellidos}`).join(', ')}.`,
            data: result.rows,
            intent: intent
          };
        } else {
          return {
            answer: `No encontré personas cuyo ${field} empiece con "${letter}".`,
            data: [],
            intent: intent
          };
        }

      case 'direct_search':
        let searchQuery = 'SELECT *, EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad FROM personas WHERE 1=1';
        const searchParams = [];
        let searchParamIndex = 1;

        // Valid database columns for direct search
        const validColumns = ['primer_nombre', 'segundo_nombre', 'apellidos', 'numero_documento', 'tipo_documento', 'genero', 'correo_electronico', 'celular'];

        // Build dynamic query based on parameters
        Object.keys(intent.parameters).forEach(key => {
          const value = intent.parameters[key];
          if (value !== undefined && value !== null) {
            if (key === 'edad_min') {
              searchQuery += ` AND EXTRACT(YEAR FROM AGE(fecha_nacimiento)) >= $${searchParamIndex}`;
              searchParams.push(value);
              searchParamIndex++;
            } else if (key === 'edad_max') {
              searchQuery += ` AND EXTRACT(YEAR FROM AGE(fecha_nacimiento)) <= $${searchParamIndex}`;
              searchParams.push(value);
              searchParamIndex++;
            } else if (validColumns.includes(key)) {
              if (key === 'primer_nombre' || key === 'apellidos') {
                searchQuery += ` AND ${key} ILIKE $${searchParamIndex}`;
                searchParams.push(`%${value}%`);
              } else {
                searchQuery += ` AND ${key} = $${searchParamIndex}`;
                searchParams.push(value);
              }
              searchParamIndex++;
            }
            // Skip invalid columns to prevent SQL errors
          }
        });

        searchQuery += ' ORDER BY primer_nombre, apellidos';

        result = await pool.query(searchQuery, searchParams);

        if (result.rows.length > 0) {
          return {
            answer: `Encontré ${result.rows.length} persona(s) que coinciden con los criterios: ${result.rows.map(p => `${p.primer_nombre} ${p.segundo_nombre || ''} ${p.apellidos}`).join(', ')}.`,
            data: result.rows,
            intent: intent
          };
        } else {
          return {
            answer: 'No encontré personas que coincidan con los criterios especificados.',
            data: [],
            intent: intent
          };
        }

      default:
        // Fallback to semantic search
        return processNLQuery(query);
    }
  } catch (error) {
    console.error('Error processing NL query:', error);
    throw error;
  }
}

// Helper function to log transactions
async function logTransaction(type, query, status, req, responseData = null, error = null) {
  try {
    const logServiceUrl = process.env.LOG_SERVICE_URL || 'http://log-service:3005';
    await axios.post(`${logServiceUrl}/log`, {
      transaction_type: type,
      entity_type: 'NLP_QUERY',
      user_id: req.headers['x-user-id'],
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      request_data: { query },
      response_data: responseData,
      status: status,
      error_message: error
    });
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
}

// Routes

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      service: 'nlp-service',
      gemini_configured: !!process.env.GEMINI_API_KEY,
      qdrant_url: process.env.QDRANT_URL || 'http://qdrant:6333'
    });
  } catch (error) {
    res.status(503).json({ status: 'ERROR', error: error.message });
  }
});

// Natural language query endpoint
app.post('/query', async (req, res) => {
  try {
    const { pregunta } = req.body;

    if (!pregunta) {
      return res.status(400).json({ error: 'La pregunta es requerida' });
    }

    // Process the query
    const result = await processNLQuery(pregunta);

    // Log successful query
    await logTransaction('NLP_QUERY', pregunta, 'SUCCESS', req, result);

    res.json({
      pregunta,
      respuesta: result.answer,
      datos: result.data,
      metadata: {
        intent: result.intent,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error processing query:', error);
    
    // Log error
    await logTransaction('NLP_QUERY', req.body.pregunta, 'ERROR', req, null, error.message);

    res.status(500).json({ 
      error: 'Error procesando la consulta',
      message: error.message 
    });
  }
});

// Update embeddings endpoint (called when personas are created/updated)
app.post('/update-embedding', async (req, res) => {
  try {
    const { persona } = req.body;

    if (!persona) {
      return res.status(400).json({ error: 'Persona data is required' });
    }

    // Calculate age if not provided
    if (!persona.edad && persona.fecha_nacimiento) {
      const birthDate = new Date(persona.fecha_nacimiento);
      const today = new Date();
      persona.edad = today.getFullYear() - birthDate.getFullYear();
    }

    await updatePersonaEmbedding(persona);

    res.json({ message: 'Embedding updated successfully' });
  } catch (error) {
    console.error('Error updating embedding:', error);
    res.status(500).json({ error: 'Error updating embedding' });
  }
});

// Sync all personas embeddings
app.post('/sync-embeddings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
      FROM personas p
    `);

    const personas = result.rows;
    
    for (const persona of personas) {
      await updatePersonaEmbedding(persona);
    }

    res.json({ 
      message: 'Embeddings synchronized successfully',
      count: personas.length 
    });
  } catch (error) {
    console.error('Error syncing embeddings:', error);
    res.status(500).json({ error: 'Error syncing embeddings' });
  }
});

// Initialize on startup
initializeVectorDB().then(() => {
  console.log('Vector DB initialized');
}).catch(console.error);

app.listen(PORT, () => {
  console.log(`NLP service running on port ${PORT}`);
});
