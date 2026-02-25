import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CvAnalysisResult {
  skills: string[];
  experience: string;
  education: string;
  yearsOfExperience?: number;
  languages?: string[];
  summary?: string;
  extractedData: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
}

/**
 * Analyse un CV en utilisant l'IA (Llama local ou API externe)
 * @param filePath Chemin vers le fichier CV
 * @returns Résultat de l'analyse du CV
 */
export async function analyzeCvWithChatGPT(filePath: string): Promise<CvAnalysisResult> {
  const { baseUrl, apiKey, model } = (await import('./aiConfig.js')).getAIConfig();
  if (!apiKey) {
    throw new Error('Clé API IA non configurée : définissez OPENAI_API_KEY ou GROQ_API_KEY dans le .env (ex. app/backend/.env)');
  }

  // Lire le fichier CV
  const fullPath = path.join(__dirname, '../../', filePath);
  let cvContent: string;

  try {
    const fileBuffer = fs.readFileSync(fullPath);

    if (fullPath.toLowerCase().endsWith('.pdf')) {
      // Extraire le texte du PDF pour l'envoyer à l'IA (contenu réel du CV, pas de placeholder)
      const pdfModule = await import('pdf-parse');
      const pdfParse = typeof pdfModule.default === 'function' ? pdfModule.default : (pdfModule as any);
      const pdfData = await pdfParse(fileBuffer);
      cvContent = (pdfData?.text || '').trim();
      if (!cvContent) {
        throw new Error('Aucun texte extrait de ce PDF (fichier scanné ou protégé ?)');
      }
    } else {
      cvContent = fileBuffer.toString('utf-8');
    }
  } catch (error) {
    throw new Error(`Erreur lors de la lecture du fichier CV: ${error}`);
  }

  // Préparer le prompt pour l'IA
  const prompt = `Analyse ce CV et extrais les informations suivantes au format JSON strict (sans markdown, juste le JSON) :

{
  "skills": ["compétence1", "compétence2", ...],
  "experience": "Description de l'expérience professionnelle",
  "education": "Niveau d'éducation et formations",
  "yearsOfExperience": nombre,
  "languages": ["langue1", "langue2", ...],
  "summary": "Résumé professionnel en 2-3 phrases",
  "extractedData": {
    "name": "Nom complet",
    "email": "email@example.com",
    "phone": "+33...",
    "location": "Ville, Pays"
  }
}

CV à analyser :
${cvContent.substring(0, 4000)} // Limiter à 4000 caractères pour éviter les limites de tokens

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en analyse de CV. Extrais les informations de manière précise et structurée. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Plus bas = plus déterministe
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Erreur API OpenAI: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Aucune réponse de ChatGPT');
    }

    // Parser la réponse JSON
    // ChatGPT peut parfois ajouter du markdown, on nettoie
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysisResult: CvAnalysisResult = JSON.parse(cleanedContent);

    // Valider et nettoyer les résultats
    return {
      skills: Array.isArray(analysisResult.skills) ? analysisResult.skills : [],
      experience: analysisResult.experience || '',
      education: analysisResult.education || '',
      yearsOfExperience: analysisResult.yearsOfExperience || 0,
      languages: Array.isArray(analysisResult.languages) ? analysisResult.languages : [],
      summary: analysisResult.summary || '',
      extractedData: analysisResult.extractedData || {},
    };
  } catch (error: any) {
    console.error('Erreur lors de l\'analyse du CV avec ChatGPT:', error);
    
    // En cas d'erreur, retourner un résultat par défaut plutôt que de faire échouer l'upload
    return {
      skills: [],
      experience: '',
      education: '',
      yearsOfExperience: 0,
      languages: [],
      summary: 'Erreur lors de l\'analyse automatique du CV',
      extractedData: {},
    };
  }
}
