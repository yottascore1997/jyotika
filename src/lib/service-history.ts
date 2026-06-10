export interface ServiceHistoryEntry {
  date: string;
  activity: string;
  details: string;
  reference: string;
  party: string;
  category: string;
  status: string;
}

export type StockWithHistory = {
  stockId: string;
  receivedDate: Date;
  location: string;
  oemSupplier: string;
  receipt: {
    grnNumber: string;
    receivedDate: Date;
    supplierOem: string;
    receivedBy: string;
  } | null;
  issues: Array<{
    issueNumber: string;
    issueDate: Date;
    issuedTo: string;
    customerName: string | null;
    purpose: string;
    status: string;
    remarks: string | null;
  }>;
  demos: Array<{
    demoId: string;
    issueDate: Date;
    salesPerson: string;
    customer: string | null;
    status: string;
    remarks: string | null;
  }>;
  handovers: Array<{
    customerName: string;
    customerCompany: string | null;
    handoverDate: Date;
    status: string;
    remarks: string | null;
  }>;
  repairs: Array<{
    repairId: string;
    customerName: string;
    complaint: string;
    receivedDate: Date;
    repairStartDate: Date | null;
    repairCompletionDate: Date | null;
    returnDate: Date | null;
    status: string;
    remarks: string | null;
  }>;
  oemReturns: Array<{
    returnId: string;
    oemName: string;
    returnDate: Date;
    reason: string;
    status: string;
  }>;
  sales: Array<{
    invoiceNumber: string;
    customer: string;
    saleDate: Date;
    amount: unknown;
  }>;
  poAllocations: Array<{
    model: string;
    status: string;
    stockType: string;
    poMaster: {
      poNumber: string;
      clientName: string;
      poDate: Date;
      status: string;
      salesPerson: string;
    };
  }>;
};

export function buildServiceHistory(stock: StockWithHistory): ServiceHistoryEntry[] {
  const entries: ServiceHistoryEntry[] = [];

  if (stock.receipt) {
    entries.push({
      date: stock.receipt.receivedDate.toISOString(),
      activity: "Inward (Import)",
      details: `Imported from ${stock.receipt.supplierOem}`,
      reference: stock.receipt.grnNumber,
      party: stock.receipt.supplierOem,
      category: "Receipt",
      status: "Received",
    });
  }

  entries.push({
    date: stock.receivedDate.toISOString(),
    activity: "Stock Entry",
    details: "Received in warehouse",
    reference: stock.stockId,
    party: stock.location || "Main Warehouse",
    category: "Stock",
    status: "In Stock",
  });

  for (const sale of stock.sales) {
    entries.push({
      date: sale.saleDate.toISOString(),
      activity: "Outward (Sale)",
      details: "Sold to client",
      reference: sale.invoiceNumber,
      party: sale.customer,
      category: "Sale",
      status: "Sold",
    });
  }

  for (const handover of stock.handovers) {
    entries.push({
      date: handover.handoverDate.toISOString(),
      activity: "Outward (Handover)",
      details: handover.remarks || "Delivered to customer",
      reference: "—",
      party: handover.customerCompany || handover.customerName,
      category: "Handover",
      status: handover.status,
    });
  }

  for (const issue of stock.issues) {
    entries.push({
      date: issue.issueDate.toISOString(),
      activity: "Outward (Issue)",
      details: issue.remarks || issue.purpose,
      reference: issue.issueNumber,
      party: issue.customerName || issue.issuedTo,
      category: "Issue",
      status: issue.status,
    });
  }

  for (const demo of stock.demos) {
    entries.push({
      date: demo.issueDate.toISOString(),
      activity: "Outward (Demo)",
      details: demo.remarks || "Demo unit issued",
      reference: demo.demoId,
      party: demo.customer || demo.salesPerson,
      category: "Demo",
      status: demo.status,
    });
  }

  for (const repair of stock.repairs) {
    entries.push({
      date: repair.receivedDate.toISOString(),
      activity: "Service Received",
      details: `Issue: ${repair.complaint}`,
      reference: repair.repairId,
      party: repair.customerName,
      category: "Repair",
      status: repair.status,
    });

    if (repair.repairCompletionDate || repair.status === "Repaired") {
      entries.push({
        date: (repair.repairCompletionDate || repair.receivedDate).toISOString(),
        activity: "Service Completed",
        details: repair.remarks || "Repaired & tested OK",
        reference: repair.repairId,
        party: repair.customerName,
        category: "Repair",
        status: "Completed",
      });
    }

    if (repair.returnDate) {
      entries.push({
        date: repair.returnDate.toISOString(),
        activity: "Returned to Client",
        details: repair.remarks || "Dispatched to customer",
        reference: repair.repairId,
        party: repair.customerName,
        category: "Repair",
        status: "Returned",
      });
    }
  }

  for (const oemReturn of stock.oemReturns) {
    entries.push({
      date: oemReturn.returnDate.toISOString(),
      activity: "Returned to OEM",
      details: oemReturn.reason,
      reference: oemReturn.returnId,
      party: oemReturn.oemName,
      category: "OEM Return",
      status: oemReturn.status,
    });
  }

  for (const alloc of stock.poAllocations) {
    entries.push({
      date: alloc.poMaster.poDate.toISOString(),
      activity: `PO Allocation (${alloc.status})`,
      details: `${alloc.stockType} — ${alloc.model}`,
      reference: alloc.poMaster.poNumber,
      party: alloc.poMaster.clientName,
      category: "PO",
      status: alloc.status,
    });
  }

  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return entries;
}

export function getDisplayStatus(stock: {
  currentStatus: string;
  sales: Array<unknown>;
  handovers: Array<{ status: string }>;
}): string {
  if (stock.currentStatus === "Sold" || stock.sales.length > 0) return "Delivered";
  if (stock.currentStatus === "Repair") return "Under Service";
  if (stock.currentStatus === "Issued" || stock.currentStatus === "Demo") return "With Customer";
  if (stock.handovers.some((h) => h.status === "Active")) return "With Customer";
  if (stock.currentStatus === "Available") return "In Stock";
  return stock.currentStatus;
}
