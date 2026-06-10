import { buildServiceHistory, type StockWithHistory } from "@/lib/service-history";
import { serializeStockSet, type StockSetRecord } from "@/lib/serializers";

export function buildSetHistory(stockSet: StockSetRecord) {
  const history = [
    {
      date: stockSet.receivedDate.toISOString(),
      activity: "Inward (Set)",
      details: `${stockSet.items?.length ?? 0} item(s) in set — Main Serial: ${stockSet.mainSerialNumber || "—"}`,
      reference: stockSet.setId,
      party: stockSet.oemSupplier,
      category: "Set",
      status: stockSet.currentStatus,
    },
    ...(stockSet.items ?? []).flatMap((item) =>
      buildServiceHistory(item as unknown as StockWithHistory).map((entry) => ({
        ...entry,
        details: `[${item.partRole || "Item"} — ${item.serialNumber}] ${entry.details}`,
      }))
    ),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    stockSet: serializeStockSet(stockSet),
    history,
    totalEvents: history.length,
    displayStatus: stockSet.currentStatus,
    searchMode: "set" as const,
  };
}

export const setHistoryInclude = {
  items: {
    include: {
      receipt: true,
      issues: { orderBy: { issueDate: "asc" as const } },
      demos: { orderBy: { issueDate: "asc" as const } },
      handovers: { orderBy: { handoverDate: "asc" as const } },
      repairs: { orderBy: { receivedDate: "asc" as const } },
      oemReturns: { orderBy: { returnDate: "asc" as const } },
      sales: { orderBy: { saleDate: "asc" as const } },
      poAllocations: {
        include: { poMaster: true },
        orderBy: { createdAt: "asc" as const },
      },
    },
    orderBy: { id: "asc" as const },
  },
};
