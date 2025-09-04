// Test script to verify Gemini API connectivity
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGeminiAPI() {
  console.log('🔍 Testing Gemini API...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }

  console.log('✅ API Key found:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log('📡 Testing basic text generation...');
    const result = await model.generateContent("tell me a joke");
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API Response:', text);

    // Test embedding model
    console.log('📡 Testing embedding model...');
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embedResult = await embeddingModel.embedContent("Test text for embedding");
    const embedding = embedResult.embedding;
    
    console.log('✅ Embedding generated, dimension:', embedding.values.length);
    
    console.log('🎉 All tests passed! Gemini API is working correctly.');
    
  } catch (error) {
    console.error('❌ Error testing Gemini API:', error.message);
    
    if (error.message.includes('429')) {
      console.log('📊 Quota exceeded. Try again in a few minutes or check your API limits.');
    } else if (error.message.includes('403')) {
      console.log('🔑 Authentication error. Check if your API key is valid.');
    } else if (error.message.includes('fetch failed')) {
      console.log('🌐 Network connectivity issue. Check internet connection.');
    }
  }
}

// Run test
testGeminiAPI().then(() => {
  console.log('Test completed.');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
