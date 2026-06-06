import { NextRequest, NextResponse } from "next/server";
import { getStockBySerial } from "@/lib/stock-service";
import { serializeStock } from "@/lib/serializers";
import { toNumber } from "@/lib/utils";

type Params = { params: { serial: string } };

interface TimelineEvent {
  type: string;
  date: string;
  title: string;
  details: Record<string, unknown>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const serialNumber = decodeURIComponent(params.serial);
    const stock = await getStockBySerial(serialNumber);

    if (!stock) {
      return NextResponse.json(
        { error: `No stock found for serial number ${serialNumber}` },
        { status: 404 }
      );
    }

    const timeline: TimelineEvent[] = [];

    if (stock.receipt) {
      timeline.push({
        type: "Receipt",
        date: stock.receipt.receivedDate.toISOString(),
        title: `GRN ${stock.receipt.grnNumber}`,
        details: {
          grnNumber: stock.receipt.grnNumber,
          supplierOem: stock.receipt.supplierOem,
          receivedBy: stock.receipt.receivedBy,
          quantity: stock.receipt.quantity,
        },
      });
    }

    for (const m of stock.movements) {
      timeline.push({
        type: m.movementType,
        date: m.date.toISOString(),
        title: `${m.movementType}: ${m.fromLocation} → ${m.toLocation}`,
        details: {
          movementId: m.movementId,
          fromLocation: m.fromLocation,
          toLocation: m.toLocation,
          user: m.user,
          remarks: m.remarks,
        },
      });
    }

    for (const issue of stock.issues) {
      timeline.push({
        type: "Material Issue",
        date: issue.issueDate.toISOString(),
        title: `Issue ${issue.issueNumber} — ${issue.purpose}`,
        details: {
          issueNumber: issue.issueNumber,
          issuedTo: issue.issuedTo,
          purpose: issue.purpose,
          status: issue.status,
          expectedReturnDate: issue.expectedReturnDate?.toISOString() ?? null,
          actualReturnDate: issue.actualReturnDate?.toISOString() ?? null,
        },
      });
    }

    for (const demo of stock.demos) {
      timeline.push({
        type: "Demo",
        date: demo.issueDate.toISOString(),
        title: `Demo ${demo.demoId} — ${demo.status}`,
        details: {
          demoId: demo.demoId,
          salesPerson: demo.salesPerson,
          customer: demo.customer,
          status: demo.status,
          expectedReturnDate: demo.expectedReturnDate?.toISOString() ?? null,
          actualReturnDate: demo.actualReturnDate?.toISOString() ?? null,
        },
      });
    }

    for (const handover of stock.handovers) {
      timeline.push({
        type: "Customer Handover",
        date: handover.handoverDate.toISOString(),
        title: `Handover to ${handover.customerName}`,
        details: {
          customerName: handover.customerName,
          customerCompany: handover.customerCompany,
          status: handover.status,
          expectedReturnDate: handover.expectedReturnDate?.toISOString() ?? null,
          actualReturnDate: handover.actualReturnDate?.toISOString() ?? null,
        },
      });
    }

    for (const repair of stock.repairs) {
      timeline.push({
        type: "Repair",
        date: repair.receivedDate.toISOString(),
        title: `Repair ${repair.repairId} — ${repair.status}`,
        details: {
          repairId: repair.repairId,
          customerName: repair.customerName,
          complaint: repair.complaint,
          status: repair.status,
          repairStartDate: repair.repairStartDate?.toISOString() ?? null,
          repairCompletionDate: repair.repairCompletionDate?.toISOString() ?? null,
          returnDate: repair.returnDate?.toISOString() ?? null,
        },
      });
    }

    for (const oemReturn of stock.oemReturns) {
      timeline.push({
        type: "OEM Return",
        date: oemReturn.returnDate.toISOString(),
        title: `OEM Return ${oemReturn.returnId} — ${oemReturn.status}`,
        details: {
          returnId: oemReturn.returnId,
          oemName: oemReturn.oemName,
          reason: oemReturn.reason,
          status: oemReturn.status,
        },
      });
    }

    for (const sale of stock.sales) {
      timeline.push({
        type: "Sale",
        date: sale.saleDate.toISOString(),
        title: `Sale — Invoice ${sale.invoiceNumber}`,
        details: {
          invoiceNumber: sale.invoiceNumber,
          customer: sale.customer,
          amount: toNumber(sale.amount),
        },
      });
    }

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      stock: serializeStock(stock),
      timeline,
    });
  } catch (error) {
    console.error("GET /api/stock/trace/[serial]:", error);
    return NextResponse.json({ error: "Failed to fetch traceability data" }, { status: 500 });
  }
}
