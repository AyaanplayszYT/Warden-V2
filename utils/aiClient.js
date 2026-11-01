const logger = require('./logger');

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = [
    process.env.OPENROUTER_MODEL,
    'google/gemma-4-26b-a4b-it:free',
    'google/gemma-4-31b-it:free',
    'openrouter/free',
].filter(Boolean);

const TUNGTUNG_SYSTEM = `You are TungTungSecure AI, an eccentric, funky, hyper-witty cyber-intelligence entity guarding this Discord server.
Your tone: Funky, sharp, sarcastic, playfully dramatic, mixing cyber-security jargon with internet humor.
STRICT RULE: NEVER use any emojis anywhere in your response (no smiles, no symbols, zero emojis).
Use clean typography, bullet points (•), and bold text for punchy delivery.
Keep responses concise, hilarious, and under 250 words.`;

/**
 * Call OpenRouter API with automated fallback & timeout protection
 */
async function generate({ prompt, system = TUNGTUNG_SYSTEM, temperature = 0.85, maxTokens = 600 }) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is not configured in .env');
    }

    let lastError = null;

    for (const model of DEFAULT_MODELS) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 14000);

        try {
            const response = await fetch(OPENROUTER_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://github.com/AyaanplayszYT/Warden-V2',
                    'X-Title': 'TungTungSecure',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    models: [model, 'openrouter/free'].filter((m, i, arr) => m && arr.indexOf(m) === i),
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: prompt },
                    ],
                    temperature,
                    max_tokens: maxTokens,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errBody = await response.text().catch(() => '');
                let detail = `status ${response.status}`;
                try {
                    const parsed = JSON.parse(errBody);
                    if (parsed.error?.message) {
                        detail = parsed.error.message;
                    }
                } catch (e) {}
                logger.warn(`OpenRouter model ${model} failed (${response.status}): ${detail}`);
                lastError = new Error(`${model}: ${detail}`);
                continue; // Try next fallback model
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content?.trim();

            if (reply) {
                // Strip any rogue emojis just in case
                const cleanReply = reply.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]/gu, '');
                return cleanReply;
            }
        } catch (err) {
            clearTimeout(timeout);
            logger.warn(`OpenRouter error with ${model}:`, err.message);
            lastError = err;
        }
    }

    throw lastError || new Error('All OpenRouter AI models failed to respond.');
}

module.exports = {
    generate,
    TUNGTUNG_SYSTEM,
};
