/**
 * Índice de exportación para los adaptadores de IA
 */

const BaseAIAdapter = require('./base-ai-adapter');
const GeminiAdapter = require('./gemini-adapter');
const OpenAIAdapter = require('./openai-adapter');
const AIAdapterFactory = require('./ai-adapter-factory');

module.exports = {
  BaseAIAdapter,
  GeminiAdapter,
  OpenAIAdapter,
  AIAdapterFactory
};
