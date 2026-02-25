/**
 * Configuration partagée pour les appels IA (OpenAI compatible : OpenAI, Groq, Llama local, etc.)
 * Priorité : GROQ_API_KEY > OPENAI_API_BASE_URL + OPENAI_API_KEY > Llama local (127.0.0.1:8080)
 */
export function getAIConfig(): { baseUrl: string; apiKey: string; model: string } {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openAIKey = process.env.OPENAI_API_KEY?.trim();
  const rawBase = process.env.OPENAI_API_BASE_URL;
  const baseUrlEnv = rawBase ? rawBase.trim().replace(/\/$/, '') : '';

  // 1) Groq explicite : GROQ_API_KEY dans .env
  if (groqKey) {
    const baseUrl = (process.env.GROQ_API_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
    const model = process.env.AI_MODEL || process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    return { baseUrl, apiKey: groqKey, model };
  }

  // 2) URL de base explicite (OpenAI, Groq, ou Llama local)
  if (baseUrlEnv) {
    const apiKey = openAIKey || 'local-llama-key';
    const model = process.env.AI_MODEL || (baseUrlEnv.includes('groq.com') ? 'llama-3.1-8b-instant' : 'llama-3.2-3b-instruct');
    return { baseUrl: baseUrlEnv, apiKey, model };
  }

  // 3) Clé OpenAI fournie sans base URL → supposer Groq (évite 127.0.0.1 par défaut)
  if (openAIKey && openAIKey !== 'local-llama-key') {
    const baseUrl = 'https://api.groq.com/openai/v1';
    const model = process.env.AI_MODEL || 'llama-3.1-8b-instant';
    return { baseUrl, apiKey: openAIKey, model };
  }

  // 4) Llama local (uniquement si rien d’autre n’est configuré)
  const baseUrl = 'http://127.0.0.1:8080/v1';
  const model = process.env.AI_MODEL || 'llama-3.2-3b-instruct';
  return { baseUrl, apiKey: 'local-llama-key', model };
}
