// app/api/tts/route.ts
import { NextRequest } from 'next/server';



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body.text || '').toString().trim();
    const lang = (body.lang || 'en-US').toString(); 

    if (!text) {
      return new Response('Missing text', { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID');
      return new Response('TTS env vars not configured', { status: 500 });
    }

    // استدعاء ElevenLabs
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!elevenRes.ok) {
      const errText = await elevenRes.text().catch(() => '');
      console.error('ElevenLabs error:', elevenRes.status, errText);
      return new Response('TTS provider failed', { status: 500 });
    }

    const audioBuffer = await elevenRes.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('TTS route error:', err);
    return new Response('TTS route failed', { status: 500 });
  }
}
