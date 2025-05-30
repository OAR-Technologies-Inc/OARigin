import { OpenAI } from 'npm:openai@4.28.0';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { prompt, gameMode } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('Received prompt:', prompt);
    console.log('Game mode:', gameMode);

    const systemPrompt = gameMode === 'free_text'
      ? 'You are a cooperative AI storyteller. Create engaging, real-time story scenes based on player choices. Respond with narrative text only, without numbered options or choices.'
      : 'You are a cooperative AI storyteller. Create engaging, real-time story scenes based on player choices. Respond with narrative text followed by 3-5 numbered options in the format: Choices:\n1. Option\n2. Option';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const text = completion.choices[0]?.message?.content || '';
    console.log('AI response:', text);

    return new Response(
      JSON.stringify({ text }),
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
        details: error.message 
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