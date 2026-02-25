import { User, JobOffer } from '../types/index.js';

/**
 * Génère une note courte (avantages / inconvénients) du CV par rapport à l'offre via GPT.
 */
export async function generateCvNoteForOffer(candidate: User, jobOffer: JobOffer): Promise<string> {
  const { baseUrl, apiKey, model } = (await import('./aiConfig.js')).getAIConfig();
  if (!apiKey) {
    return '';
  }

  const skills = candidate.profile?.skills?.join(', ') || 'Non renseigné';
  const experience = candidate.profile?.experience || candidate.profile?.cvAnalysis?.experience || 'Non renseigné';
  const education = candidate.profile?.education || candidate.profile?.cvAnalysis?.education || 'Non renseigné';
  const years = candidate.profile?.cvAnalysis?.yearsOfExperience ?? 0;
  const summary = candidate.profile?.cvAnalysis?.summary || '';

  const prompt = `Tu es un recruteur. En 3 à 5 lignes maximum, rédige une note synthétique sur ce candidat par rapport à l'offre d'emploi.
Indique brièvement : 1-2 points forts (avantages par rapport au poste), puis 1-2 points d'attention ou lacunes éventuelles (inconvénients).
Sois factuel et neutre. Réponds UNIQUEMENT en français, sans titre ni puces, en paragraphe continu.

**Offre :** ${jobOffer.title}. Compétences : ${jobOffer.skills.join(', ')}. Niveau : ${jobOffer.experience}. ${jobOffer.location}, ${jobOffer.contractType}.

**Profil candidat :** Compétences : ${skills}. Expérience : ${experience}. Formation : ${education}. Années d'expérience : ${years}. ${summary ? `Résumé : ${summary}` : ''}

**Note (3-5 lignes) :**`;

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
          { role: 'system', content: 'Tu rédiges des notes de recrutement concises et factuelles en français.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 300,
      }),
    });

    if (!response.ok) return '';
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    return text;
  } catch (e) {
    console.error('generateCvNoteForOffer error:', e);
    return '';
  }
}
