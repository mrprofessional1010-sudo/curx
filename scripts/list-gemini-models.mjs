const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

async function listGeminiModels() {
  console.log("Listing available models from Gemini API...\n");
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`Found ${(data.models || []).length} models:`);
      const generateModels = (data.models || []).filter(m => m.supportedGenerationMethods?.includes("generateContent"));
      generateModels.forEach(m => console.log(` - ${m.name} (${m.displayName})`));

      // Now test the first generateContent model
      if (generateModels.length > 0) {
        const testModel = generateModels[0].name.replace("models/", "");
        console.log(`\nTesting model '${testModel}'...`);
        const genRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${GEMINI_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "State 1 sentence on CYP2C19 clopidogrel." }] }]
          })
        });
        if (genRes.ok) {
          const genData = await genRes.json();
          console.log(`✅ SUCCESS with model '${testModel}':`);
          console.log(`   "${genData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}"`);
        } else {
          console.log(`❌ Failed with '${testModel}':`, await genRes.text());
        }
      }
    } else {
      console.log("Error listing models:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

listGeminiModels();
