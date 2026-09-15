import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const query = searchParams.get("q")?.trim() || "";
  const geneId = searchParams.get("geneId");

  try {
    if (type === "medications") {
      let req = supabase
        .from("medications")
        .select("id, canonical_name, rxcui, active_ingredient, dosage_form, uses, side_effects")
        .order("canonical_name", { ascending: true })
        .limit(20);

      if (query) {
        req = req.ilike("canonical_name", `%${query}%`);
      }

      const { data, error } = await req;
      if (error) throw error;
      return NextResponse.json({ results: data || [] });
    }

    if (type === "genes") {
      let req = supabase
        .from("genes")
        .select("id, symbol, name, locus_group, location")
        .order("symbol", { ascending: true })
        .limit(20);

      if (query) {
        req = req.or(`symbol.ilike.%${query}%,name.ilike.%${query}%`);
      }

      const { data, error } = await req;
      if (error) throw error;
      return NextResponse.json({ results: data || [] });
    }

    if (type === "variants") {
      let req = supabase
        .from("genetic_variants")
        .select("id, gene_id, variant_name, rs_id, phenotype, clinical_significance")
        .order("variant_name", { ascending: true });

      if (geneId) {
        req = req.eq("gene_id", geneId);
      } else if (query) {
        req = req.ilike("variant_name", `%${query}%`);
      }

      const { data, error } = await req.limit(30);
      if (error) throw error;
      return NextResponse.json({ results: data || [] });
    }

    if (type === "conditions") {
      let req = supabase
        .from("conditions")
        .select("id, canonical_name, description, precaution_1, precaution_2, precaution_3, precaution_4")
        .order("canonical_name", { ascending: true })
        .limit(20);

      if (query) {
        req = req.ilike("canonical_name", `%${query}%`);
      }

      const { data, error } = await req;
      if (error) throw error;
      return NextResponse.json({ results: data || [] });
    }

    if (type === "symptoms") {
      let req = supabase
        .from("symptoms")
        .select("id, canonical_name, clinical_weight")
        .order("canonical_name", { ascending: true })
        .limit(30);

      if (query) {
        req = req.ilike("canonical_name", `%${query}%`);
      }

      const { data, error } = await req;
      if (error) throw error;
      return NextResponse.json({ results: data || [] });
    }

    return NextResponse.json({ error: "Invalid catalog search type specified." }, { status: 400 });
  } catch (err: any) {
    console.error("Catalog search API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
