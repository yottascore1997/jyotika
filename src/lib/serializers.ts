import { toNumber } from "@/lib/utils";

type StockRecord = {
  id: number;
  stockId: string;
  materialType: string;
  oemSupplier: string;
  make: string | null;
  modelNumber: string;
  serialNumber: string;
  description: string | null;
  category: string;
  receivedDate: Date;
  warrantyStatus: string;
  poNumber: string | null;
  purchaseCost: unknown;
  currentStatus: string;
  currentHolder: string;
  location: string;
  remarks: string | null;
  quantity: number;
  quantityUnit: string;
  purpose: string | null;
  commercialInvoiceNo: string | null;
  commercialInvoiceDate: Date | null;
  awbNumber: string | null;
  workingCondition: string | null;
  stockSetId: number | null;
  partRole: string | null;
  stockSet?: { setId: string; id: number } | null;
  images?: Array<{
    id: number;
    filePath: string;
    fileName: string;
    sortOrder: number;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeEntityImage(image: {
  id: number;
  filePath: string;
  fileName: string;
  sortOrder: number;
  createdAt: Date;
}) {
  return {
    id: image.id,
    url: image.filePath.startsWith("/") ? image.filePath : `/${image.filePath}`,
    fileName: image.fileName,
    sortOrder: image.sortOrder,
    createdAt: image.createdAt.toISOString(),
  };
}

export const serializeStockImage = serializeEntityImage;

export function serializeStock(stock: StockRecord) {
  return {
    ...stock,
    purchaseCost: toNumber(stock.purchaseCost),
    receivedDate: stock.receivedDate.toISOString(),
    commercialInvoiceDate: stock.commercialInvoiceDate?.toISOString() ?? null,
    createdAt: stock.createdAt.toISOString(),
    updatedAt: stock.updatedAt.toISOString(),
    stockSet: stock.stockSet ?? null,
    images: stock.images?.map(serializeStockImage) ?? [],
  };
}

export type StockSetRecord = {
  id: number;
  setId: string;
  mainSerialNumber: string | null;
  modelNumber: string;
  make: string | null;
  oemSupplier: string;
  materialType: string;
  category: string;
  receivedDate: Date;
  warrantyStatus: string;
  poNumber: string | null;
  purchaseCost: unknown;
  currentStatus: string;
  currentHolder: string;
  location: string;
  remarks: string | null;
  quantity: number;
  quantityUnit: string;
  purpose: string | null;
  commercialInvoiceNo: string | null;
  commercialInvoiceDate: Date | null;
  awbNumber: string | null;
  workingCondition: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: StockRecord[];
};

export function serializeStockSet(set: StockSetRecord) {
  return {
    ...set,
    purchaseCost: toNumber(set.purchaseCost),
    receivedDate: set.receivedDate.toISOString(),
    commercialInvoiceDate: set.commercialInvoiceDate?.toISOString() ?? null,
    createdAt: set.createdAt.toISOString(),
    updatedAt: set.updatedAt.toISOString(),
    items: set.items?.map(serializeStock),
  };
}

export function serializeMovement(movement: {
  id: number;
  movementId: string;
  serialNumber: string;
  date: Date;
  fromLocation: string;
  toLocation: string;
  movementType: string;
  user: string;
  remarks: string | null;
  stockMasterId: number;
  createdAt: Date;
}) {
  return {
    ...movement,
    date: movement.date.toISOString(),
    createdAt: movement.createdAt.toISOString(),
  };
}

export function serializeReceipt(receipt: {
  id: number;
  grnNumber: string;
  receivedDate: Date;
  supplierOem: string;
  materialDescription: string;
  modelNumber: string;
  serialNumber: string;
  quantity: number;
  materialType: string;
  receivedBy: string;
  poNumber: string | null;
  remarks: string | null;
  stockMasterId: number;
  createdAt: Date;
}) {
  return {
    ...receipt,
    receivedDate: receipt.receivedDate.toISOString(),
    createdAt: receipt.createdAt.toISOString(),
  };
}

export function serializeIssue(issue: {
  id: number;
  issueNumber: string;
  issueDate: Date;
  serialNumber: string;
  materialDescription: string;
  issuedTo: string;
  customerName: string | null;
  purpose: string;
  expectedReturnDate: Date | null;
  actualReturnDate: Date | null;
  status: string;
  remarks: string | null;
  stockMasterId: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...issue,
    issueDate: issue.issueDate.toISOString(),
    expectedReturnDate: issue.expectedReturnDate?.toISOString() ?? null,
    actualReturnDate: issue.actualReturnDate?.toISOString() ?? null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

export function serializeDemo(demo: {
  id: number;
  demoId: string;
  serialNumber: string;
  model: string;
  salesPerson: string;
  customer: string | null;
  issueDate: Date;
  expectedReturnDate: Date | null;
  actualReturnDate: Date | null;
  status: string;
  remarks: string | null;
  stockMasterId: number;
  createdAt: Date;
  updatedAt: Date;
  daysOut?: number;
}) {
  return {
    ...demo,
    issueDate: demo.issueDate.toISOString(),
    expectedReturnDate: demo.expectedReturnDate?.toISOString() ?? null,
    actualReturnDate: demo.actualReturnDate?.toISOString() ?? null,
    createdAt: demo.createdAt.toISOString(),
    updatedAt: demo.updatedAt.toISOString(),
  };
}

export function serializeHandover(handover: {
  id: number;
  customerName: string;
  customerCompany: string | null;
  serialNumber: string;
  handoverDate: Date;
  expectedReturnDate: Date | null;
  actualReturnDate: Date | null;
  status: string;
  remarks: string | null;
  stockMasterId: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...handover,
    handoverDate: handover.handoverDate.toISOString(),
    expectedReturnDate: handover.expectedReturnDate?.toISOString() ?? null,
    actualReturnDate: handover.actualReturnDate?.toISOString() ?? null,
    createdAt: handover.createdAt.toISOString(),
    updatedAt: handover.updatedAt.toISOString(),
  };
}

export function serializeRepair(repair: {
  id: number;
  repairId: string;
  serialNumber: string;
  customerName: string;
  complaint: string;
  receivedDate: Date;
  repairStartDate: Date | null;
  repairCompletionDate: Date | null;
  returnDate: Date | null;
  status: string;
  remarks: string | null;
  stockMasterId: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...repair,
    receivedDate: repair.receivedDate.toISOString(),
    repairStartDate: repair.repairStartDate?.toISOString() ?? null,
    repairCompletionDate: repair.repairCompletionDate?.toISOString() ?? null,
    returnDate: repair.returnDate?.toISOString() ?? null,
    createdAt: repair.createdAt.toISOString(),
    updatedAt: repair.updatedAt.toISOString(),
  };
}

export function serializeService(service: {
  id: number;
  serviceId: string;
  serialNumber: string;
  customerName: string;
  serviceType: string;
  serviceDate: Date;
  completionDate: Date | null;
  status: string;
  description: string | null;
  remarks: string | null;
  stockMasterId: number;
  createdAt: Date;
  updatedAt: Date;
  stockMaster?: {
    modelNumber: string;
    make: string | null;
    currentStatus: string;
  };
}) {
  return {
    ...service,
    serviceDate: service.serviceDate.toISOString(),
    completionDate: service.completionDate?.toISOString() ?? null,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

export function serializeOemReturn(oemReturn: {
  id: number;
  returnId: string;
  oemName: string;
  serialNumber: string;
  returnDate: Date;
  reason: string;
  status: string;
  remarks: string | null;
  stockMasterId: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...oemReturn,
    returnDate: oemReturn.returnDate.toISOString(),
    createdAt: oemReturn.createdAt.toISOString(),
    updatedAt: oemReturn.updatedAt.toISOString(),
  };
}

export function serializeSale(sale: {
  id: number;
  invoiceNumber: string;
  customer: string;
  serialNumber: string;
  saleDate: Date;
  amount: unknown;
  stockMasterId: number;
  createdAt: Date;
}) {
  return {
    ...sale,
    amount: toNumber(sale.amount),
    saleDate: sale.saleDate.toISOString(),
    createdAt: sale.createdAt.toISOString(),
  };
}

export function serializePO(po: {
  id: number;
  poId: string;
  clientName: string;
  location: string;
  poNumber: string;
  poDate: Date;
  orderType: string;
  salesPerson: string;
  itemDescription: string;
  serialNumber?: string | null;
  quantityOrdered: number;
  unitValue: unknown;
  totalPoValue: unknown;
  advanceRequired: boolean;
  advanceReceived: boolean;
  expectedDeliveryDate: Date | null;
  status: string;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  images?: Array<{
    id: number;
    filePath: string;
    fileName: string;
    sortOrder: number;
    createdAt: Date;
  }>;
  serialAllocations?: Array<{
    id: number;
    poMasterId: number;
    model: string;
    serialNumber: string;
    stockType: string;
    status: string;
    stockMasterId: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  _count?: { serialAllocations: number };
}) {
  return {
    ...po,
    serialNumber: po.serialNumber ?? null,
    unitValue: toNumber(po.unitValue),
    totalPoValue: toNumber(po.totalPoValue),
    poDate: po.poDate.toISOString(),
    expectedDeliveryDate: po.expectedDeliveryDate?.toISOString() ?? null,
    createdAt: po.createdAt.toISOString(),
    updatedAt: po.updatedAt.toISOString(),
    images: po.images?.map(serializeEntityImage) ?? [],
    serialAllocations: po.serialAllocations?.map(serializePOAllocation),
  };
}

export function serializePOAllocation(allocation: {
  id: number;
  poMasterId: number;
  model: string;
  serialNumber: string;
  stockType: string;
  status: string;
  stockMasterId: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...allocation,
    createdAt: allocation.createdAt.toISOString(),
    updatedAt: allocation.updatedAt.toISOString(),
  };
}

export function serializeTenderDocument(document: {
  id: number;
  docType: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  createdAt: Date;
}) {
  return {
    id: document.id,
    docType: document.docType,
    url: document.filePath.startsWith("/") ? document.filePath : `/${document.filePath}`,
    fileName: document.fileName,
    fileSize: document.fileSize,
    createdAt: document.createdAt.toISOString(),
  };
}

export function serializeTender(tender: {
  id: number;
  organizationName: string;
  location: string;
  tenderBidNo: string;
  tenderSubmittedDate: Date;
  quotedProduct: string;
  orderValue: unknown;
  status: string;
  statusAsOnDate: string;
  fixedRa: string;
  miiPreference: string;
  tenderType: string;
  createdAt: Date;
  updatedAt: Date;
  documents?: Array<{
    id: number;
    docType: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    createdAt: Date;
  }>;
}) {
  return {
    ...tender,
    orderValue: toNumber(tender.orderValue),
    tenderSubmittedDate: tender.tenderSubmittedDate.toISOString(),
    createdAt: tender.createdAt.toISOString(),
    updatedAt: tender.updatedAt.toISOString(),
    documents: tender.documents?.map(serializeTenderDocument) ?? [],
  };
}
