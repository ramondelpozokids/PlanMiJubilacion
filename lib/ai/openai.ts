import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getAdvisorContext } from '@/lib/ai/advisor-context';
import { buildChatSystemPrompt } from '@/lib/ai/prompts';

export async function getChatContext(userId: string) {
  return getAdvisorContext(userId);
}

export async function streamChatResponse(
  userMessage: string,
  userId: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  const context = await getAdvisorContext(userId);
  const systemPrompt = buildChatSystemPrompt(context);

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: [
      ...history.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    maxTokens: 800,
  });

  return result;
}
