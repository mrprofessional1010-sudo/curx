const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

async function testWorkingModels() {
  const models = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite"
  ];

  for (const model of models) {
    const start = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Explain CYP2C19 clopidogrel interaction in 1 concise sentence." }] }],
          generationConfig: { maxOutputTokens: 80, temperature: 0.2 }
        })
      });
      const latency = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log(`✅ [${model}] SUCCESS in ${latency}ms:`);
        console.log(`   "${text.trim()}"\n`);
      } else {
        const err = await res.text();
        console.log(`❌ [${model}] HTTP ${res.status}: ${err.slice(0, 150)}\n`);
      }
    } catch (e) {
      console.log(`❌ [${model}] Exception: ${e.message}\n`);
    }
  }
}

testWorkingModels();
