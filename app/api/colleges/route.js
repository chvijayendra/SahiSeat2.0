import { NextResponse } from "next/server";
import { loadAllCsvRecords, getInstituteType, getNitState } from "../../lib/csvData";

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }));
}

export const dynamic = "force-dynamic";

let cachedColleges = null;

function getRecordBranch(programName) {
  const name = (programName || "").toLowerCase().trim();

  // AI (only pure AI branches)
  if (
    name.includes("artificial intelligence") ||
    name.includes("artificial intelligence and machine learning") ||
    name.includes("ai and machine learning") ||
    name.includes("machine learning")
  ) {
    return "AI";
  }

  // CSE
  if (
    name.includes("computer science") ||
    name.includes("computer engineering") ||
    name.includes("software engineering") ||
    name.includes("computer science and business systems") ||
    name.includes("csbs") ||
    name.includes("data science")
  ) {
    return "CSE";
  }

  // IT
  if (name.includes("information technology")) {
    return "IT";
  }

  // ECE
  if (
    name.includes("electronics and communication") ||
    name.includes("electronics & communication") ||
    name.includes("telecommunication")
  ) {
    return "ECE";
  }

  return "Other";
}

export async function GET() {
  try {
    if (cachedColleges) {
      return handleCORS(NextResponse.json(cachedColleges));
    }

    const records = loadAllCsvRecords();
    const seen = new Set();
    const colleges = [];

    // Filter validation logic (matching app/api/predict/route.js to avoid architecture/planning spa/dasa listings)
    const validateRecord = (r) => {
      if (!r) return false;
      const courseName = (r.program || "").toLowerCase();
      const instituteName = (r.institute || "").toLowerCase();
      const quotaLower = (r.quota || "").toLowerCase();
      const seatTypeLower = (r.seatType || "").toLowerCase();

      const isArch = courseName.includes("arch") || courseName.includes("architecture");
      const isPlan = courseName.includes("planning") || courseName.includes("bplan") || courseName.includes("b.plan");
      const isSpa = instituteName.includes("school of planning") || instituteName.includes("spa") || instituteName.includes("planning and architecture");
      const isDasa = quotaLower.includes("dasa") || quotaLower.includes("foreign") || quotaLower.includes("nri") || quotaLower.includes("oci") || quotaLower.includes("pio") ||
                     seatTypeLower.includes("dasa") || seatTypeLower.includes("foreign") || seatTypeLower.includes("nri") || seatTypeLower.includes("oci") || seatTypeLower.includes("pio") ||
                     courseName.includes("dasa") || courseName.includes("nri") || courseName.includes("foreign");

      return !isArch && !isPlan && !isSpa && !isDasa;
    };

    for (const r of records) {
      if (!validateRecord(r)) continue;

      const key = `${r.institute}|${r.program}|${r.seatType}|${r.quota}|${r.gender}|${r.round}`;
      if (!seen.has(key)) {
        seen.add(key);
        
        const branch = getRecordBranch(r.program);
        const state = getNitState(r.institute) || "Other";
        const type = getInstituteType(r.institute);

        colleges.push({
          institute: r.institute,
          program: r.program,
          branch,
          state,
          type,
          quota: r.quota || "All",
          seatType: r.seatType || "OPEN",
          gender: r.gender || "Gender-Neutral",
          openingRank: r.openingRank,
          closingRank: r.closingRank,
          round: r.round || 1
        });
      }
    }

    // Sort alphabetically by institute name, then program name
    colleges.sort((a, b) => {
      const instComp = a.institute.localeCompare(b.institute);
      if (instComp !== 0) return instComp;
      return a.program.localeCompare(b.program);
    });

    cachedColleges = colleges;
    return handleCORS(NextResponse.json(colleges));
  } catch (err) {
    console.error("Colleges API Error:", err);
    return handleCORS(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
  }
}
