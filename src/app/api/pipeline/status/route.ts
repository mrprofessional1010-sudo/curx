import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();

  try {
    // 1. Fetch recent ingestion run logs
    const { data: runs, error: rError } = await supabase
      .from("data_ingestion_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);

    // 2. Fetch table counts
    const { count: genesCount } = await supabase.from("genes").select("*", { count: "exact", head: true });
    const { count: medsCount } = await supabase.from("medications").select("*", { count: "exact", head: true });
    const { count: condsCount } = await supabase.from("conditions").select("*", { count: "exact", head: true });
    const { count: symsCount } = await supabase.from("symptoms").select("*", { count: "exact", head: true });
    const { count: ddiCount } = await supabase.from("drug_drug_interactions").select("*", { count: "exact", head: true });
    const { count: gdrCount } = await supabase.from("gene_drug_relationships").select("*", { count: "exact", head: true });
    const { count: cdrCount } = await supabase.from("condition_drug_relationships").select("*", { count: "exact", head: true });
    const { count: fdaCount } = await supabase.from("drug_label_documents").select("*", { count: "exact", head: true });
    const { count: evCount } = await supabase.from("evidence_sources").select("*", { count: "exact", head: true });

    return NextResponse.json({
      status: "HEALTHY",
      liveDatabaseMetrics: {
        genes: genesCount || 0,
        medications: medsCount || 0,
        conditions: condsCount || 0,
        symptoms: symsCount || 0,
        drugDrugInteractions: ddiCount || 0,
        geneDrugRules: gdrCount || 0,
        conditionDrugRules: cdrCount || 0,
        openFDALabelDocuments: fdaCount || 0,
        evidenceSources: evCount || 0,
      },
      recentIngestionRuns: runs || [],
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error retrieving pipeline status:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
