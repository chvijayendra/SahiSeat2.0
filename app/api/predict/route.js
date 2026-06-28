import { NextResponse } from "next/server";
import { loadAllCsvRecords, getInstituteType, getNitState } from "../../lib/csvData";

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }));
}

export const dynamic = "force-dynamic";

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

function isPreferred(programName, preferredBranches) {
  if (!Array.isArray(preferredBranches) || preferredBranches.length === 0) {
    return false;
  }
  const branch = getRecordBranch(programName);
  return preferredBranches.includes(branch);
}

// POST handler for predicting eligible seats
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rank = Number(body.rank);
    const category = (body.category || "").trim();
    const gender = (body.gender || "").trim();
    const homeState = (body.state || "").trim();
    const preferredBranches = Array.isArray(body.preferredBranches) ? body.preferredBranches : [];

    // Input Validation
    if (!Number.isFinite(rank) || rank <= 0) {
      return handleCORS(
        NextResponse.json({ error: "Invalid rank. Must be a positive number." }, { status: 400 })
      );
    }
    if (!category) {
      return handleCORS(
        NextResponse.json({ error: "category (Seat Type) is required." }, { status: 400 })
      );
    }
    if (!gender) {
      return handleCORS(
        NextResponse.json({ error: "gender is required." }, { status: 400 })
      );
    }

    // Load CSV data dynamically (ensures fresh load if files changed)
    const records = loadAllCsvRecords();

    // Eligibility Rules:
    // 1. Seat Type matches selected category
    // 2. Gender matches selected gender
    // 3. Opening Rank <= User Rank <= Closing Rank
    // 4. Home State (HS) Quota rule:
    //    For NITs, if quota is "Home State", it is only eligible if user's Home State matches NIT's state.
    const filtered = [];
    
    // Diagnostic counts for eligible records (before sorting/limiting)
    let eligibleNitCount = 0;
    let eligibleIiitCount = 0;
    let eligibleGftiCount = 0;
    let eligibleOtherCount = 0;
    let hsEligibleCount = 0;
    let osEligibleCount = 0;
    let eligibleOldLogicCount = 0;
    let eligibleNewLogicCount = 0;

    // Validation function to verify clean records (final validation step)
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
      if (r.seatType !== category) continue;
      if (r.gender !== gender) continue;
      if (r.closingRank === null) continue;

      // Filter check in the match loop
      if (!validateRecord(r)) continue;

      const type = getInstituteType(r.institute);
      const quotaLower = r.quota.toLowerCase();

      // Home State (HS) & Other State (OS) eligibility checks for NITs
      if (type === "NIT") {
        const nitState = getNitState(r.institute);
        if (quotaLower === "home state") {
          // Discard if Home State does not match NIT location state
          if (homeState !== nitState) {
            continue;
          }
        }
      }

      // Old Logic Match: Opening Rank <= User Rank <= Closing Rank
      const matchesOld = r.openingRank !== null && rank >= r.openingRank && rank <= r.closingRank;
      // New Logic Match: User Rank <= Closing Rank
      const matchesNew = rank <= r.closingRank;

      if (matchesOld) {
        eligibleOldLogicCount++;
      }
      if (matchesNew) {
        eligibleNewLogicCount++;
      }

      // Switch predictor to the new logic:
      if (!matchesNew) continue;

      // Track quota counts for diagnostics
      if (quotaLower === "home state") {
        hsEligibleCount++;
      } else if (quotaLower === "other state") {
        osEligibleCount++;
      }

      if (type === "NIT") eligibleNitCount++;
      else if (type === "IIIT") eligibleIiitCount++;
      else if (type === "GFTI") eligibleGftiCount++;
      else eligibleOtherCount++;

      const recordBranch = getRecordBranch(r.program);

// Strict branch filtering
if (
  preferredBranches.length > 0 &&
  !preferredBranches.includes(recordBranch)
) {
  continue;
}

const matchesPref =
  preferredBranches.includes(recordBranch);

      filtered.push({
        institute: r.institute,
        program: r.program,
        quota: r.quota,
        seatType: r.seatType,
        gender: r.gender,
        openingRank: r.openingRank,
        closingRank: r.closingRank,
        round: r.round,
        sourceFile: r.sourceFile,
        rankGap: r.closingRank - rank,
        instituteType: type,
        branch: recordBranch,
        matchesPreferred: matchesPref,
      });
    }

    // Sort by:
    // 1. Preferred branch match priority (matching branches rank higher)
    // 2. rankGap ascending (smallest positive gap first)
    const hasPreferences = preferredBranches.length > 0;
    filtered.sort((a, b) => {
      if (hasPreferences) {
        const aPref = a.matchesPreferred ? 0 : 1;
        const bPref = b.matchesPreferred ? 0 : 1;
        if (aPref !== bPref) {
          return aPref - bPref;
        }
      }
      return a.rankGap - b.rankGap;
    });

    // Feature 1: Home State NIT Opportunities (top 10 branches in user's home state NIT)
    // Deduplicate by institute+program, keeping the earliest round for each unique pair.
    const hsNitList = filtered.filter(item => item.instituteType === "NIT" && getNitState(item.institute) === homeState);
    // Sort by round ascending so earliest round appears first during dedup
    const hsNitSortedByRound = [...hsNitList].sort((a, b) => (a.round || 0) - (b.round || 0));
    const hsSeenKeys = new Set();
    const hsNitDeduped = [];
    for (const item of hsNitSortedByRound) {
      const key = `${item.institute}|${item.program}`;
      if (!hsSeenKeys.has(key)) {
        hsSeenKeys.add(key);
        hsNitDeduped.push(item);
      }
    }
    // Re-sort deduped list by rankGap ascending for best-first display
    hsNitDeduped.sort((a, b) => a.rankGap - b.rankGap);
    const homeStateNitOpportunities = hsNitDeduped.slice(0, 10).filter(validateRecord);

    // Feature 3: Recommendation Buckets (max 50 total results)
    const bestMatches = filtered.slice(0, 10).filter(validateRecord);
    const goodOptions = filtered.slice(10, 30).filter(validateRecord);
    const exploreMore = filtered.slice(30, 50).filter(validateRecord);
    const allEligible = filtered.slice(0, 50).filter(validateRecord); // Keep for backwards compatibility

    return handleCORS(
      NextResponse.json({
        query: { rank, category, gender, state: homeState, preferredBranches },
        totalEligible: filtered.length,
        totalEligibleColleges: new Set(filtered.map(r => r.institute)).size,
        bestMatches,
        goodOptions,
        exploreMore,
        homeStateNitOpportunities,
        allEligible,
        diagnostics: {
          totalRecordsLoaded: records.length,
          totalEligibleBeforeSorting: filtered.length,
          eligibleNitCount,
          eligibleIiitCount,
          eligibleGftiCount,
          eligibleOtherCount,
          hsEligibleCount,
          osEligibleCount,
          eligibleOldLogicCount,
          eligibleNewLogicCount,
          // Aliases for absolute verification safety
          hsCount: hsEligibleCount,
          osCount: osEligibleCount,
          nitCount: eligibleNitCount,
          iiitCount: eligibleIiitCount,
          gftiCount: eligibleGftiCount,
          otherCount: eligibleOtherCount,
          otherInstituteCount: eligibleOtherCount,
        }
      })
    );

  } catch (error) {
    console.error("Predict API Error:", error);
    return handleCORS(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
