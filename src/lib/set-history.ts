import { buildServiceHistory } from "@/lib/service-history";
import { serializeStockSet } from "@/lib/serializers";

type StockSetWithItems = {
  setId: string;
  mainSerialNumber: string;
  receivedDate: Date;
  oemSupplier: string;
  currentStatus: string;
  items: Array<{
    serialNumber: string;
    partRole: string | null;
    stockId: string;
    receivedDate: Date;
    location: string;
    receipt: unknown;
    issues: unknown[];
    demos: unknown[];
    handovers: unknown[];
    repairs: unknown[];
    oemReturns: unknown[];
    sales: unknown[];
    poAllocations: unknown[];
  }>;
};

export function buildSetHistory(stockSet: StockSetWithItems) {
  const history = [
    {
      date: stockSet.receivedDate.toISOString(),
      activity: "Inward (Complete Set)",
      details: `${stockSet.items.length} item(s) in set — Main Serial: ${stockSet.mainSerialNumber}`,
      reference: stockSet.setId,
      party: stockSet.oemSupplier,
      category: "Set",
      status: stockSet.currentStatus,
    },
    ...stockSet.items.flatMap((item) =>
      buildServiceHistory(item as Parameters<typeof buildServiceHistory>[0]).map((entry) => ({
        ...entry,
        details: `[${item.partRole || "Item"} — ${item.serialNumber}] ${entry.details}`,
      }))
    ),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    stockSet: serializeStockSet(stockSet as Parameters<typeof serializeStockSet>[0]),
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
