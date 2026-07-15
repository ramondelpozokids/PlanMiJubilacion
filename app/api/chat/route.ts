import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getUser, createClient, getProfile } from '@/lib/supabase/server';
import { getAdvisorContext } from '@/lib/ai/advisor-context';
import { buildChatSystemPrompt } from '@/lib/ai/prompts';
import { hasUnlimitedAccess } from '@/lib/admin/access';

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return new Response('No autenticado', { status: 401 });

  const profile = await getProfile();
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== 'user') {
    return new Response('Mensaje inválido', { status: 400 });
  }

  const context = await getAdvisorContext(user.id);
  const systemPrompt = buildChatSystemPrompt(context);

  const supabase = await createClient();
  await supabase.from('chat_messages').insert({
    user_id: user.id,
    role: 'user',
    content: lastMessage.content,
    metadata: hasUnlimitedAccess(profile) ? { unlimited: true } : null,
  });

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: messages.slice(-10),
    temperature: 0.7,
    maxTokens: hasUnlimitedAccess(profile) ? 2000 : 800,
    onFinish: async ({ text }) => {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: text,
      });
    },
  });

  return result.toAIStreamResponse();
}
