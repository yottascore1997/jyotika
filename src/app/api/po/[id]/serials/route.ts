import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { allocateSerial, dispatchSerial, releaseSerial } from "@/lib/po-service";
import { serializePOAllocation } from "@/lib/serializers";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const rows = await prisma.pOSerialAllocation.findMany({
      where: { poMasterId: Number(params.id) },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows.map(serializePOAllocation));
  } catch (error) {
    console.error("GET /api/po/[id]/serials:", error);
    return NextResponse.json({ error: "Failed to fetch serial allocations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    if (!body.serialNumber) {
      return NextResponse.json({ error: "serialNumber is required" }, { status: 400 });
    }

    const allocation = await allocateSerial({
      poMasterId: Number(params.id),
      serialNumber: body.serialNumber,
    });

    return NextResponse.json(serializePOAllocation(allocation), { status: 201 });
  } catch (error) {
    console.error("POST /api/po/[id]/serials:", error);
    const message = error instanceof Error ? error.message : "Failed to allocate serial";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    if (body.action === "dispatch" && body.allocationId) {
      const allocation = await dispatchSerial(Number(body.allocationId));
      return NextResponse.json(serializePOAllocation(allocation));
    }
    if (body.action === "dispatchAll") {
      const { dispatchAllReserved } = await import("@/lib/po-service");
      await dispatchAllReserved(Number(params.id));
      const rows = await prisma.pOSerialAllocation.findMany({
        where: { poMasterId: Number(params.id) },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(rows.map(serializePOAllocation));
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/po/[id]/serials:", error);
    const message = error instanceof Error ? error.message : "Failed to update allocation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { searchParams } = new URL(request.url);
    const allocationId = searchParams.get("allocationId");
    if (!allocationId) {
      return NextResponse.json({ error: "allocationId is required" }, { status: 400 });
    }

    await releaseSerial(Number(allocationId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/po/[id]/serials:", error);
    const message = error instanceof Error ? error.message : "Failed to release serial";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
