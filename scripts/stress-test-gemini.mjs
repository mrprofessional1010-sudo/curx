const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const MODEL = "gemini-flash-lite-latest";

async function stressTestGemini() {
  console.log(`Running Stress Test with 5 simultaneous requests on Google Gemini (${MODEL})...\n`);

  const prompts = [
    "Explain Clopidogrel CYP2C19 interaction in 15 words.",
    "Explain Codeine CYP2D6 ultra-rapid metabolizer risk in 15 words.",
    "Explain Simvastatin SLCO1B1 myopathy risk in 15 words.",
    "Explain Abacavir HLA-B*5701 hypersensitivity risk in 15 words.",
    "Explain Warfarin VKORC1 sensitivity in 15 words."
  ];

  const start = Date.now();
  const promises = prompts.map(async (prompt, idx) => {
    const reqStart = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 50, temperature: 0.2 }
        })
      });
      const reqLatency = Date.now() - reqStart;
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return { id: idx + 1, success: true, latency: reqLatency, text: text.trim() };
      } else {
        const err = await res.text();
        return { id: idx + 1, success: false, latency: reqLatency, error: err };
      }
    } catch (e) {
      return { id: idx + 1, success: false, latency: Date.now() - reqStart, error: e.message };
    }
  });

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - start;
  const passed = results.filter(r => r.success);

  console.log("=======================================================");
  console.log("🎯 GEMINI STRESS TEST RESULTS");
  console.log("=======================================================");
  console.log(`• Success Rate:      ${passed.length}/${results.length} (${((passed.length/results.length)*100).toFixed(0)}%)`);
  console.log(`• Total Batch Time:  ${totalDuration}ms`);
  console.log(`• Avg Latency:       ${(results.reduce((a, b) => a + b.latency, 0) / results.length).toFixed(0)}ms`);
  console.log("Responses:");
  results.forEach(r => {
    if (r.success) {
      console.log(`  [Req #${r.id}] ${r.latency}ms -> "${r.text.replace(/\n/g, ' ')}"`);
    } else {
      console.log(`  [Req #${r.id}] Failed: ${r.error}`);
    }
  });
}

stressTestGemini();
