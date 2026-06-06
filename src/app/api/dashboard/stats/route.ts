import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isOverdue } from "@/lib/stock-service";
import { serializeMovement } from "@/lib/serializers";

export async function GET() {
  try {
    const [
      allStock,
      oemReturnPending,
      activeDemos,
      repairs,
      recentMovements,
    ] = await Promise.all([
      prisma.stockMaster.findMany(),
      prisma.oEMReturn.count({ where: { status: "Pending" } }),
      prisma.demoTracking.findMany({ where: { status: { in: ["Active", "Overdue"] } } }),
      prisma.repairCase.findMany(),
      prisma.stockMovement.findMany({
        orderBy: { date: "desc" },
        take: 10,
      }),
    ]);

    const overdueIds: number[] = [];
    for (const demo of activeDemos) {
      if (demo.status === "Active" && isOverdue(demo.expectedReturnDate, demo.actualReturnDate)) {
        overdueIds.push(demo.id);
      }
    }
    if (overdueIds.length) {
      await prisma.demoTracking.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: "Overdue" },
      });
    }

    const statusCount = (status: string) =>
      allStock.filter((s) => s.currentStatus === status).length;

    const categoryMap = new Map<string, number>();
    const materialTypeMap = new Map<string, number>();
    for (const item of allStock) {
      categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
      materialTypeMap.set(item.materialType, (materialTypeMap.get(item.materialType) || 0) + 1);
    }

    const allDemos = await prisma.demoTracking.findMany();
    const demoStatusMap = new Map<string, number>();
    for (const demo of allDemos) {
      const status =
        demo.status === "Active" && isOverdue(demo.expectedReturnDate, demo.actualReturnDate)
          ? "Overdue"
          : demo.status;
      demoStatusMap.set(status, (demoStatusMap.get(status) || 0) + 1);
    }

    const repairStatusMap = new Map<string, number>();
    for (const repair of repairs) {
      repairStatusMap.set(repair.status, (repairStatusMap.get(repair.status) || 0) + 1);
    }

    const overdueDemoUnits =
      allDemos.filter(
        (d) =>
          d.status === "Overdue" ||
          (d.status === "Active" && isOverdue(d.expectedReturnDate, d.actualReturnDate))
      ).length;

    return NextResponse.json({
      totalStock: allStock.length,
      availableStock: statusCount("Available"),
      demoMaterials: statusCount("Demo"),
      repairMaterials: statusCount("Repair"),
      soldMaterials: statusCount("Sold"),
      oemReturnPending,
      overdueDemoUnits,
      activeRepairCases: repairs.filter((r) => r.status !== "Closed").length,
      stockByCategory: Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value })),
      stockByMaterialType: Array.from(materialTypeMap.entries()).map(([name, value]) => ({
        name,
        value,
      })),
      demoStatus: Array.from(demoStatusMap.entries()).map(([status, count]) => ({ status, count })),
      repairStatus: Array.from(repairStatusMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      recentMovements: recentMovements.map(serializeMovement),
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
