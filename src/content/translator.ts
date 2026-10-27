const SYSTEM = [
  'You translate notes written by Adrian, a Brazilian backend developer, from Brazilian Portuguese into English for a LinkedIn post.',
  'Keep his own words, order, tone and level of detail. Sound like a real developer talking, not a marketer.',
  'Do NOT add ideas, hooks, intros, conclusions, lessons, questions, emojis, hashtags or em dashes (—).',
  'Use short paragraphs. Output only the post text.',
].join(' ');

type Fetch = typeof fetch;

export async function translatePost(
  notes: string,
  apiKey: string,
  fetchFn: Fetch = fetch,
  model = 'openai/gpt-oss-120b',
): Promise<string> {
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada');

  const response = await fetchFn(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: notes },
        ],
      }),
    },
  );

  if (!response.ok) throw new Error(`Groq respondeu ${response.status}`);
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content
    ?.replace(/[ \t]+$/gm, '')
    .trim();
  if (!text) throw new Error('Groq não devolveu texto');
  return text;
}
