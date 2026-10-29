export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatINR(amount: number): string {
  const num = toNumber(amount);
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(num)}`;
}

export function getFinancialYearString(date: Date | string = new Date()): string {
  const d = new Date(date);
  const month = d.getMonth(); // 0 = Jan, 3 = Apr
  const year = d.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const startShort = String(startYear % 100).padStart(2, "0");
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startShort}-${endShort}`;
}

export function generateFinancialYearQuotationNumber(index: number, date: Date | string = new Date()): string {
  const fy = getFinancialYearString(date);
  const serial = String(index).padStart(3, "0");
  return `QT/${fy}/${serial}`;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function toInputDate(date?: string | Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

export function generateId(prefix: string) {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${ts}${rand}`;
}

export function generatePONumber() {
  return generateId("PO");
}

export function generateServiceCode() {
  return generateId("SRV");
}
