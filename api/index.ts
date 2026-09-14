import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function generateContentWithRetry(options: any, maxRetries = 5) {
  let currentModel = options.model || 'gemini-3.8-flash';
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      options.model = currentModel;
      return await ai.models.generateContent(options);
    } catch (error: any) {
      const errorStr = typeof error === 'object' ? JSON.stringify(error) + String(error) + (error.message || '') : String(error);
      if (errorStr.includes('503') || errorStr.includes('high demand') || errorStr.includes('UNAVAILABLE') || errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
        if (attempt === maxRetries) {
          throw error;
        }
        // Switch to a lighter model after the first failure
        if (attempt >= 1) {
          console.log(`[Attempt ${attempt}] Falling back to gemini-3.1-flash-lite due to quota/demand.`);
          currentModel = 'gemini-3.1-flash-lite';
        }
        const delay = attempt * 3000;
        console.log(`[Attempt ${attempt}] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

app.post('/api/extract', async (req, res) => {
    try {
      const { transcript, language } = req.body;
      if (!transcript) {
        return res.status(400).json({ error: 'Transcript is required' });
      }

      const langPrompt = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' }[language as string] || 'Português';

      const response = await generateContentWithRetry({
        model: 'gemini-3.8-flash',
        contents: `Analise a transcrição a seguir e extraia as informações ESTRITAMENTE NO IDIOMA: ${langPrompt}.\n1. Stakeholders envolvidos\n2. Siglas e termos a serem confirmados\n3. Datas e Prazos\n4. Próximos Passos (Ação e Responsável)\n\nTranscrição:\n${transcript}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              stakeholders: { type: Type.STRING, description: 'Stakeholders envolvidos (bullets)' },
              terms: { type: Type.STRING, description: 'Siglas e termos (bullets)' },
              dates: { type: Type.STRING, description: 'Datas e prazos (bullets)' },
              nextSteps: { type: Type.STRING, description: 'Próximos passos com ação e responsável (bullets)' },
            },
            required: ['stakeholders', 'terms', 'dates', 'nextSteps'],
          },
        },
      });

      const data = JSON.parse(response.text?.trim() || '{}');
      res.json(data);
    } catch (error) {
      console.error('Error extracting data:', error);
      res.status(500).json({ error: 'Failed to extract data' });
    }
  });

  app.post('/api/email', async (req, res) => {
    try {
      const { stakeholders, terms, dates, nextSteps, language, transcript } = req.body;
      
      const langPrompt = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' }[language as string] || 'Português';

      const prompt = `Você é um gerente de projetos. Gere um e-mail semanal ao cliente no idioma: ${langPrompt}.
Baseie as seções principais PRIORITARIAMENTE nos dados curados abaixo.
DADOS CURADOS (USE-OS DIRETAMENTE, IGNORANDO CONTRADIÇÕES COM A TRANSCRIÇÃO):
Stakeholders:\n${stakeholders}\n
Siglas:\n${terms}\n
Datas:\n${dates}\n
Próximos Passos:\n${nextSteps}

Transcrição original (apenas para contexto de Avanços e Pendências, se faltarem dados acima):\n${transcript}

ESTRUTURA OBRIGATÓRIA:
- Abertura cordial
- **Avanços ✅** (bullet points)
- **Pendências ⚠️** (bullet points)
- **Próximos Passos 🔜** (Tabela Markdown: | Data Limite | Atividade / Entrega | Responsável | EXCLUSIVAMENTE baseados nos "DADOS CURADOS > Próximos Passos" acima)

REGRAS: 
- Avanços e Pendências em bullet points.
- Próximos Passos OBRIGATORIAMENTE em formato de Tabela Markdown.
- Títulos em negrito. 
- Sem assinatura. 
- Idioma: ${langPrompt}.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      res.json({ email: response.text?.trim() });
    } catch (error) {
      console.error('Error generating email:', error);
      res.status(500).json({ error: 'Failed to generate email' });
    }
  });

  app.post('/api/risks', async (req, res) => {
    try {
      const { email, transcript, language } = req.body;
      
      const langPrompt = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' }[language as string] || 'Português';

      const prompt = `Aja como gerente de projetos e gere "Resumo Executivo" para o Slack. 
Analise este e-mail:\n${email}\nE a transcrição:\n${transcript}
Escreva no idioma: ${langPrompt}.
Use a PRIMEIRA PESSOA contando o que está ocorrendo e preveja/alerte sobre "Pontos de Atenção/Riscos ocultos".
Nunca mencione que você é IA.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      res.json({ risks: response.text?.trim() });
    } catch (error) {
      console.error('Error generating risks:', error);
      res.status(500).json({ error: 'Failed to generate risks' });
    }
  });

  app.post('/api/slack', async (req, res) => {
    try {
      const { risks, language } = req.body;
      
      const langPrompt = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' }[language as string] || 'Português';

      const prompt = `Aja como gerente relatando para a gestão via Slack.
Reescreva isto no idioma: ${langPrompt}.
Mensagem:\n${risks}

OBRIGATÓRIO: O formato deve seguir estritamente o modelo abaixo (adapte para o contexto atual):

The [Project Name] project has progressed toward completing the [phase] with the activation of [key things].
Regarding pending items and points of attention, there is an urgent need to [risks/blockers]. The next steps are focused on immediate deliverables:

This Week: [Action] ([Owner]).
Early Next Week: [Action] ([Owner]).

REGRAS: Seja denso, executivo, em um único parágrafo para o status, um para riscos e bullets para próximos passos. NUNCA mencione IA.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      res.json({ report: response.text?.trim() });
    } catch (error) {
      console.error('Error generating slack report:', error);
      res.status(500).json({ error: 'Failed to generate slack report' });
    }
  });

  app.post('/api/slack_final', async (req, res) => {
    try {
      const { report } = req.body;
      if (!report) {
        return res.status(400).json({ error: 'Report is required' });
      }

      const prompt = `Traduza o seguinte report OBRIGATORIAMENTE para o INGLÊS.
Adicione no final do texto uma linha de Sentimento (Farol de Sentimento) no formato: 'Sentiment: [emoji] - [breve justificativa]'.
Os emojis permitidos são 🟢 (verde - no prazo/tudo bem), 🟡 (amarelo - riscos controlados/prazos apertados), 🔴 (vermelho - bloqueado/crítico).

Report:
${report}

Retorne apenas o texto traduzido e o sentimento.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      
      res.json({ finalReport: response.text?.trim() });
    } catch (error) {
      console.error('Error generating final slack report:', error);
      res.status(500).json({ error: 'Failed to generate final slack report' });
    }
  });

export default app;
