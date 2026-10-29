import * as XLSX from "xlsx";
import { formatDate } from "@/lib/utils";

export interface QuotationExportRow {
  quotationNumber: string;
  quotationDate: string;
  customerName: string;
  companyName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  productModel: string;
  quotationAmount: number;
  discountAmount?: number | null;
  poAmount?: number | null;
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
  // Map records to completely separate columns without mixing any fields.
  // "Quotation Made By" is specifically placed as the LAST column.
  const excelData = rows.map((q, idx) => ({
    "S.No": idx + 1,
    "Quotation Number": q.quotationNumber,
    "Quotation Date": q.quotationDate ? formatDate(q.quotationDate) : "-",
    "Customer Name": q.customerName || "-",
    "Company Name": q.companyName || "-",
    "Mobile No": q.customerPhone || "-",
    "Email": q.customerEmail || "-",
    "Product / Model": q.productModel || "-",
    "QT Amount (INR)": q.quotationAmount || 0,
    "Discount Amount (INR)": q.discountAmount || 0,
    "PO Amount (INR)": q.poAmount || 0,
    "Region": q.region || "-",
    "Location": q.location || "-",
    "Sales Engineer": q.salesEngineer || "-",
    "Order Status": q.orderStatus || "-",
    "Follow-up Status": q.followUpStatus || "-",
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
    { wch: 14 }, // Quotation Date
    { wch: 22 }, // Customer Name
    { wch: 28 }, // Company Name
    { wch: 18 }, // Mobile No
    { wch: 26 }, // Email
    { wch: 30 }, // Product / Model
    { wch: 18 }, // QT Amount (INR)
    { wch: 20 }, // Discount Amount (INR)
    { wch: 18 }, // PO Amount (INR)
    { wch: 14 }, // Region
    { wch: 18 }, // Location
    { wch: 18 }, // Sales Engineer
    { wch: 14 }, // Order Status
    { wch: 26 }, // Follow-up Status
    { wch: 18 }, // Last Follow-up Date
    { wch: 18 }, // Next Follow-up Date
    { wch: 32 }, // Next Action
    { wch: 36 }, // Follow-up Remarks
    { wch: 20 }, // Quotation Made By (Last Column)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Quotations");

  const todayStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `${filename}_${todayStr}.xlsx`);
}
