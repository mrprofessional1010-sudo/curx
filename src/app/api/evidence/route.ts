import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const sourceName = searchParams.get("source");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    let query = supabase.from("evidence_sources").select("*").limit(limit);
    if (sourceName) {
      query = query.eq("source_name", sourceName);
    }

    const { data: evidenceSources, error: evError } = await query;
    if (evError) {
      throw evError;
    }

    // Also fetch structured drug label documents
    const { data: labelDocs } = await supabase
      .from("drug_label_documents")
      .select("id, set_id, spl_id, manufacturer_name, boxed_warning, warnings, contraindications, indications_and_usage, adverse_reactions, medication:medications(canonical_name)")
      .limit(20);

    return NextResponse.json({
      evidenceSources: evidenceSources || [],
      drugLabelDocuments: (labelDocs || []).map((doc: any) => ({
        id: doc.id,
        setId: doc.set_id,
        splId: doc.spl_id,
        medicationName: doc.medication?.canonical_name || "Prescribed Therapeutic",
        manufacturer: doc.manufacturer_name,
        boxedWarning: doc.boxed_warning,
        warnings: doc.warnings,
        contraindications: doc.contraindications,
        indications: doc.indications_and_usage,
        adverseReactions: doc.adverse_reactions,
      })),
      totalEvidenceSources: (evidenceSources || []).length,
    });
  } catch (err: any) {
    console.error("Error retrieving evidence records:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
