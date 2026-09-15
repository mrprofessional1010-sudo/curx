const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

async function testGemini() {
  console.log("Testing Gemini API Key with Google Generative AI endpoints...\n");

  // Method 1: Google AI Studio endpoint via direct REST
  const modelsToTest = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

  for (const model of modelsToTest) {
    console.log(`Testing model '${model}'...`);
    const start = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Explain CYP2C19 clopidogrel interaction in 1 concise sentence." }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0.2 }
        })
      });
      const latency = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log(`✅ [${model}] SUCCESS (${latency}ms):`);
        console.log(`   "${text.trim()}"\n`);
        return { success: true, model, latency, response: text };
      } else {
        const err = await res.text();
        console.log(`❌ [${model}] HTTP ${res.status}: ${err}\n`);
      }
    } catch (err) {
      console.log(`❌ [${model}] Exception: ${err.message}\n`);
    }
  }

  // Method 2: Test OpenAI compatibility endpoint
  console.log("Testing Google's OpenAI-compatible endpoint...");
  try {
    const oaiStart = Date.now();
    const oaiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GEMINI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemini-1.5-flash",
        messages: [{ role: "user", content: "State 1 sentence on pharmacogenomics." }]
      })
    });
    const oaiLatency = Date.now() - oaiStart;
    if (oaiRes.ok) {
      const oaiData = await oaiRes.json();
      console.log(`✅ OpenAI-compatible endpoint SUCCESS (${oaiLatency}ms):`);
      console.log(`   "${oaiData.choices?.[0]?.message?.content?.trim()}"\n`);
    } else {
      console.log(`❌ OpenAI-compatible HTTP ${oaiRes.status}:`, await oaiRes.text());
    }
  } catch (err) {
    console.log("❌ OpenAI endpoint error:", err.message);
  }
}

testGemini();
