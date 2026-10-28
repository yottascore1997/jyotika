import * as XLSX from "xlsx";
import { formatDate } from "@/lib/utils";

export interface QuotationExportRow {
  quotationNumber: string;
  quotationDate: string;
  customerName: string;
  customerContact?: string | null;
  productModel: string;
  quotationAmount: number;
  region?: string | null;
  location?: string | null;
  salesEngineer: string;
  orderStatus: string;
  followUpStatus: string;
  lastFollowUpDate?: string | null;
  nextFollowUpDate?: string | null;
  nextAction?: string | null;
  followUpRemarks?: string | null;
  quotationMadeBy?: string | null;
}

export function exportQuotationsToExcel(rows: QuotationExportRow[], filename = "Quotations_Report") {
  // Map records to match user-required fields and column sequence,
  // specifically placing "Quotation Made By" as the LAST column.
  const excelData = rows.map((q, idx) => ({
    "S.No": idx + 1,
    "Quotation Number": q.quotationNumber,
    "Quotation Date": q.quotationDate ? formatDate(q.quotationDate) : "-",
    "Customer / Company Name": q.customerName,
    "Customer Contact Details": q.customerContact || "-",
    "Product / Model": q.productModel,
    "Quotation Amount (INR)": q.quotationAmount,
    "Region": q.region || "-",
    "Location": q.location || "-",
    "Sales Engineer": q.salesEngineer,
    "Order Status": q.orderStatus,
    "Follow-up Status": q.followUpStatus,
    "Last Follow-up Date": q.lastFollowUpDate ? formatDate(q.lastFollowUpDate) : "-",
    "Next Follow-up Date": q.nextFollowUpDate ? formatDate(q.nextFollowUpDate) : "-",
    "Next Action": q.nextAction || "-",
    "Follow-up Remarks": q.followUpRemarks || "-",
    "Quotation Made By": q.quotationMadeBy || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths for polished presentation
  worksheet["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // Quotation Number
    { wch: 14 }, // Date
    { wch: 30 }, // Customer
    { wch: 32 }, // Contact
    { wch: 32 }, // Product/Model
    { wch: 22 }, // Amount
    { wch: 14 }, // Region
    { wch: 20 }, // Location
    { wch: 18 }, // Sales Engineer
    { wch: 14 }, // Order Status
    { wch: 26 }, // Follow-up Status
    { wch: 18 }, // Last Follow-up
    { wch: 18 }, // Next Follow-up
    { wch: 35 }, // Next Action
    { wch: 40 }, // Remarks
    { wch: 20 }, // Quotation Made By (Last Column)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Quotations");

  const todayStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `${filename}_${todayStr}.xlsx`);
}
