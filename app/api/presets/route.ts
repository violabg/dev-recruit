import { NextResponse } from "next/server";

import { getPresetsAction } from "@/lib/actions/presets";

export async function GET() {
  const result = await getPresetsAction();

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Unable to load presets" },
      { status: 500 }
    );
  }

  return NextResponse.json(result.presets);
}
