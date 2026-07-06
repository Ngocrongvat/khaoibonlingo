// Supabase Edge Function: ielts-grade
//
// Grades an IELTS Writing or Speaking submission against the official public band
// descriptors, using an LLM (Anthropic Claude) as the judge. Runs server-side so the
// AI API key never reaches the browser (the app is a static client with no other
// backend - this function is the only server-side code in the project).
//
// SETUP REQUIRED (must be done by the project owner, not automatable from this repo):
//   1. Get an Anthropic API key: https://console.anthropic.com/
//   2. In the Supabase dashboard: Project Settings -> Edge Functions -> Secrets,
//      add a secret named ANTHROPIC_API_KEY with that key as the value.
//   3. Deploy this function from a machine with the Supabase CLI logged into your
//      project:  supabase functions deploy ielts-grade
//
// Until step 2+3 are done, the client shows a clear "chưa cấu hình AI" message
// instead of failing silently (see callIeltsGradeFunction() in assets/js/app.js).

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WRITING_CRITERIA = `Grade this IELTS Writing response using the four official IELTS Writing band descriptors, each scored 0-9:
1. Task Achievement/Response (does it address all parts of the task, with a clear position/overview and relevant, well-supported ideas?)
2. Coherence and Cohesion (logical organization, paragraphing, and use of cohesive devices)
3. Lexical Resource (range and accuracy of vocabulary)
4. Grammatical Range and Accuracy (range of sentence structures and grammatical accuracy)`;

const SPEAKING_CRITERIA = `Grade this IELTS Speaking response using the four official IELTS Speaking band descriptors, each scored 0-9:
1. Fluency and Coherence (ability to speak at length without noticeable effort, logical sequencing of ideas)
2. Lexical Resource (range and accuracy of vocabulary, ability to paraphrase)
3. Grammatical Range and Accuracy (range of sentence structures and grammatical accuracy)
4. Pronunciation (NOTE: this transcript was produced by browser speech-to-text, so no actual audio/intonation/phoneme data is available - estimate this criterion only loosely from fluency/word choice patterns in the text, and explicitly say in your feedback that this criterion could not be assessed from audio and is a rough approximation only)`;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    try {
        const { skill, taskType, prompt, userText } = await req.json();

        if (!userText || typeof userText !== "string" || !userText.trim()) {
            return new Response(JSON.stringify({ error: "Empty submission - nothing to grade." }), {
                status: 400,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            });
        }

        const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    error: "not_configured",
                    message: "ANTHROPIC_API_KEY chưa được cấu hình trong Supabase Edge Function secrets.",
                }),
                { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }

        const criteria = skill === "speaking" ? SPEAKING_CRITERIA : WRITING_CRITERIA;
        const systemPrompt = `You are an official IELTS examiner. ${criteria}

Respond with ONLY a JSON object (no markdown, no code fences) in exactly this shape:
{
  "overallBand": <number, 0-9, in 0.5 increments>,
  "criteria": [
    { "name": "<criterion name>", "band": <number 0-9>, "comment": "<1-2 sentence justification>" },
    ... (exactly 4 entries, in the order listed above)
  ],
  "feedback": "<3-5 sentence overall feedback: main strengths, main areas to improve>"
}`;

        const userMessage = `Task type: ${taskType || "unspecified"}
Task prompt given to the candidate: ${prompt || "(not provided)"}

Candidate's ${skill === "speaking" ? "spoken response (transcribed)" : "written response"}:
"""
${userText}
"""`;

        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-5",
                max_tokens: 1024,
                system: systemPrompt,
                messages: [{ role: "user", content: userMessage }],
            }),
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            return new Response(JSON.stringify({ error: "ai_request_failed", message: errText }), {
                status: 502,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            });
        }

        const aiData = await aiResponse.json();
        const rawText = aiData?.content?.[0]?.text || "";

        let parsed;
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        } catch (_e) {
            return new Response(
                JSON.stringify({ error: "parse_failed", message: "Could not parse AI response.", raw: rawText }),
                { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }

        return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "server_error", message: String(e) }), {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }
});
