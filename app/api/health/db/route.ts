import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const organizations = await prisma.organization.findMany();

    return NextResponse.json({
      ok: true,
      database: "connected",
      organizations,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
      },
      { status: 500 }
    );
  }
}