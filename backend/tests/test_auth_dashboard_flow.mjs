import fs from "fs";
import path from "path";

const baseUrl = "http://localhost:3000";

async function runAuthFlowTests() {
  console.log("=== CURX AUTHENTICATION -> DASHBOARD -> REAL DATA FLOW AUDIT ===");
  const auditResults = {};

  // TEST 1: Direct unauthenticated access to /dashboard
  try {
    const res = await fetch(`${baseUrl}/dashboard`, { redirect: "manual" });
    const isRedirect = res.status === 307 || res.status === 302 || res.status === 308;
    const location = res.headers.get("location");
    auditResults["TEST 1 — DIRECT DASHBOARD ACCESS (UNAUTHENTICATED)"] = {
      status: res.status,
      is_redirected: isRedirect,
      redirect_location: location,
      expected: "Redirect to /login?redirect=/dashboard",
      pass: isRedirect && (location?.includes("/login") || false)
    };
  } catch (err) {
    auditResults["TEST 1 — DIRECT DASHBOARD ACCESS (UNAUTHENTICATED)"] = { pass: false, error: err.message };
  }

  // TEST 2: Unauthenticated access to /login
  try {
    const res = await fetch(`${baseUrl}/login`);
    auditResults["TEST 2 — UNPROTECTED /login ACCESS"] = {
      status: res.status,
      ok: res.ok,
      pass: res.status === 200
    };
  } catch (err) {
    auditResults["TEST 2 — UNPROTECTED /login ACCESS"] = { pass: false, error: err.message };
  }

  // TEST 3: Unauthenticated access to /signup
  try {
    const res = await fetch(`${baseUrl}/signup`);
    auditResults["TEST 3 — UNPROTECTED /signup ACCESS"] = {
      status: res.status,
      ok: res.ok,
      pass: res.status === 200
    };
  } catch (err) {
    auditResults["TEST 3 — UNPROTECTED /signup ACCESS"] = { pass: false, error: err.message };
  }

  // TEST 4: Real Patient API Retrieval
  try {
    const res = await fetch(`${baseUrl}/api/patient`);
    const data = await res.json();
    auditResults["TEST 4 — REAL PATIENT DATA FROM SUPABASE"] = {
      status: res.status,
      ok: res.ok,
      patient_id: data.patient?.id,
      patient_name: data.patient?.fullName,
      medications: data.patient?.medications?.map((m) => `${m.name} (${m.dosage})`),
      variants: data.patient?.variants?.map((v) => `${v.geneSymbol} ${v.diplotype} (${v.phenotype})`),
      conditions: data.patient?.conditions?.map((c) => c.name),
      symptoms: data.patient?.symptoms?.map((s) => s.name),
      pass: Boolean(data.patient && data.patient.medications?.length > 0 && data.patient.variants?.length > 0)
    };
  } catch (err) {
    auditResults["TEST 4 — REAL PATIENT DATA FROM SUPABASE"] = { pass: false, error: err.message };
  }

  // TEST 5: Deterministic Risk Engine Evaluation with Patient Data
  try {
    const patientRes = await fetch(`${baseUrl}/api/patient`);
    const patientData = await patientRes.json();
    const p = patientData.patient;

    const riskRes = await fetch(`${baseUrl}/api/risk/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: p.id,
        medications: p.medications.map((m) => ({
          name: m.name,
          dosage: m.dosage
        })),
        variants: p.variants.map((v) => ({
          geneSymbol: v.geneSymbol,
          variantName: v.diplotype,
          phenotype: v.phenotype
        })),
        conditions: p.conditions.map((c) => ({
          name: c.name
        }))
      })
    });

    const riskData = await riskRes.json();
    const evalResult = riskData.evaluation || riskData;
    auditResults["TEST 5 — DETERMINISTIC RISK ENGINE EVALUATION"] = {
      status: riskRes.status,
      ok: riskRes.ok,
      computed_risk_tier: evalResult.overallRisk || evalResult.riskTier,
      risk_score: evalResult.riskScore,
      factors_count: evalResult.factors?.length,
      rules_fired: evalResult.factors?.map((t) => `${t.category}: ${t.id} (${t.severity})`),
      pass: riskRes.ok && Boolean(evalResult.overallRisk || evalResult.riskTier)
    };
  } catch (err) {
    auditResults["TEST 5 — DETERMINISTIC RISK ENGINE EVALUATION"] = { pass: false, error: err.message };
  }

  console.log(JSON.stringify(auditResults, null, 2));

  // Write evidence
  const evidencePath = path.resolve("docs/test-evidence/authentication_flow_test.json");
  fs.writeFileSync(evidencePath, JSON.stringify(auditResults, null, 2), "utf-8");
  console.log("Saved evidence to:", evidencePath);
}

runAuthFlowTests();
