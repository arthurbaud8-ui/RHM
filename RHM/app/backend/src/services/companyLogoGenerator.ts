import { getAIConfig } from './aiConfig.js';

/**
 * Génère une URL d'image de logo pour une entreprise en utilisant l'IA (DALL-E) ou un placeholder
 * @param companyName Nom de l'entreprise
 * @param industry Secteur d'activité (optionnel)
 * @returns URL de l'image générée ou placeholder
 */
export async function generateCompanyLogo(
  companyName: string,
  industry?: string
): Promise<string> {
  const { apiKey } = getAIConfig();

  // Si pas de clé API, utiliser un service de placeholder
  if (!apiKey) {
    return generatePlaceholderLogo(companyName);
  }

  // DALL-E nécessite l'URL OpenAI officielle, pas Groq ou d'autres providers
  // Vérifier si on a une clé OpenAI spécifique pour DALL-E, sinon utiliser la clé configurée
  const openAIKey = process.env.OPENAI_API_KEY || apiKey;
  const openAIBaseUrl = 'https://api.openai.com/v1';

  // Si la clé API n'est pas une clé OpenAI (commence par sk-), utiliser directement le placeholder
  // Groq et autres providers n'ont pas de clés qui commencent par sk-
  if (!openAIKey.startsWith('sk-')) {
    console.log('Clé API non OpenAI détectée, utilisation du placeholder pour le logo');
    return generatePlaceholderLogo(companyName);
  }

  try {
    // Utiliser DALL-E pour générer une image de logo
    const prompt = `A professional, modern company logo for "${companyName}"${
      industry ? ` in the ${industry} industry` : ''
    }. The logo should be minimalist, clean, and suitable for a recruitment platform. Use a simple color scheme with 2-3 colors maximum.`;

    const response = await fetch(`${openAIBaseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Ne pas logger l'erreur si c'est une erreur connue (comme Groq qui ne supporte pas DALL-E)
      if (!errorData.error?.message?.includes('Unknown request URL')) {
        console.error('Erreur DALL-E:', errorData);
      }
      // Fallback sur placeholder si DALL-E échoue
      return generatePlaceholderLogo(companyName);
    }

    const data = await response.json();
    if (data.data && data.data[0] && data.data[0].url) {
      return data.data[0].url;
    }

    // Fallback sur placeholder
    return generatePlaceholderLogo(companyName);
  } catch (error) {
    // Ne pas logger l'erreur si c'est une erreur connue
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('Unknown request URL')) {
      console.error('Erreur lors de la génération du logo avec DALL-E:', error);
    }
    // Fallback sur placeholder en cas d'erreur
    return generatePlaceholderLogo(companyName);
  }
}

/**
 * Génère une URL de placeholder pour le logo de l'entreprise
 * Utilise un service de placeholder basé sur le nom de l'entreprise
 * @param companyName Nom de l'entreprise
 * @returns URL du placeholder
 */
function generatePlaceholderLogo(companyName: string): string {
  // Utiliser un service de placeholder d'images avec les initiales
  const initials = companyName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  // Utiliser un service comme UI Avatars ou un placeholder personnalisé
  // Pour l'instant, on utilise un placeholder SVG encodé en base64 ou un service externe
  const colors = [
    '4F46E5', // indigo
    '059669', // emerald
    'DC2626', // red
    'EA580C', // orange
    '7C3AED', // violet
    'BE185D', // pink
  ];
  const colorIndex = companyName.length % colors.length;
  const color = colors[colorIndex];

  // Utiliser un service de placeholder comme UI Avatars ou créer un SVG
  // Pour simplifier, on utilise un placeholder avec les initiales
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=200&bold=true&font-size=0.5`;
}

/**
 * Génère ou récupère le logo d'une entreprise
 * Si le logo existe déjà, le retourne tel quel
 * Sinon, génère un nouveau logo avec l'IA
 * @param companyName Nom de l'entreprise
 * @param existingLogo Logo existant (optionnel)
 * @param industry Secteur d'activité (optionnel)
 * @returns URL du logo
 */
export async function getOrGenerateCompanyLogo(
  companyName: string,
  existingLogo?: string,
  industry?: string
): Promise<string> {
  // Si un logo existe déjà, le retourner
  if (existingLogo && existingLogo.trim().length > 0) {
    return existingLogo;
  }

  // Sinon, générer un nouveau logo
  if (!companyName || companyName.trim().length === 0) {
    // Si pas de nom d'entreprise, retourner un placeholder par défaut
    return generatePlaceholderLogo('Company');
  }

  return generateCompanyLogo(companyName, industry);
}
