import { OpenAI } from 'npm:openai@4.28.0';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are the narrator of a cooperative, turn-based text adventure game. You are never a player — only the narrator. Respond in short, vivid, immersive paragraphs. Use a clear and atmospheric tone, similar to early text-based games like Zork.

Each scene should move the story forward, focusing only on what matters. Do not repeat past events unless necessary. If danger or mystery is involved, highlight it with urgency or emotion — but keep your responses concise and never more than 150 words.

When players make dangerous choices or act recklessly, you may kill their character. If a player dies, narrate their death clearly and remove them from further turns. They may continue observing the story, but not participate. The story must always continue and eventually reach a natural conclusion.

Never break character or speak out of narration. Always refer to the players by name. Maintain the selected genre’s tone and consistency.`
        },
        {
          role: 'user',
          content: prompt,
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return new Response(
      JSON.stringify({ text: completion.choices[0]?.message?.content || '' }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Story generation error:', error);

    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate story',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
