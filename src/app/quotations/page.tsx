"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Download,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  MessageSquare,
  TrendingUp,
  User,
  MapPin,
  Building,
  Phone,
  Mail,
  Receipt,
  Tag,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  QUOTATION_ORDER_STATUSES,
  QUOTATION_FOLLOWUP_STATUSES,
  QUOTATION_REGIONS,
} from "@/lib/constants";
import {
  formatINR,
  formatDate,
  toInputDate,
  getFinancialYearString,
  generateFinancialYearQuotationNumber,
} from "@/lib/utils";
import { exportQuotationsToExcel } from "@/lib/excel-export";

type FollowUpHistory = {
  id: number;
  quotationId: number;
  followUpDate: string;
  followUpStatus: string;
  orderStatus: string | null;
  nextFollowUpDate: string | null;
  nextAction: string | null;
  remarks: string;
  updatedBy: string | null;
  createdAt: string;
};

type Quotation = {
  id: number;
  quotationNumber: string;
  quotationDate: string;
  customerName: string;
  companyName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerContact?: string | null;
  salesEngineer: string;
  productModel: string;
  quotationAmount: number;
  discountAmount?: number | null;
  poAmount?: number | null;
  region?: string | null;
  location?: string | null;
  quotationMadeBy?: string | null;
  orderStatus: string;
  followUpStatus: string;
  lastFollowUpDate?: string | null;
  nextFollowUpDate?: string | null;
  nextAction?: string | null;
  followUpRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
  followUps?: FollowUpHistory[];
};

type QuotationForm = {
  quotationNumber: string;
  quotationDate: string;
  customerName: string;
  companyName: string;
  customerPhone: string;
  customerEmail: string;
  salesEngineer: string;
  productModel: string;
  quotationAmount: number | "";
  discountAmount: number | "";
  poAmount: number | "";
  region: string;
  location: string;
  quotationMadeBy: string;
  orderStatus: string;
  followUpStatus: string;
  nextFollowUpDate: string;
  nextAction: string;
  followUpRemarks: string;
};

const initialForm = (defaultNumber = ""): QuotationForm => ({
  quotationNumber: defaultNumber,
  quotationDate: new Date().toISOString().split("T")[0],
  customerName: "",
  companyName: "",
  customerPhone: "",
  customerEmail: "",
  salesEngineer: "",
  productModel: "",
  quotationAmount: "",
  discountAmount: "",
  poAmount: "",
  region: "West",
  location: "",
  quotationMadeBy: "",
  orderStatus: "Open",
  followUpStatus: "Follow-up Pending",
  nextFollowUpDate: "",
  nextAction: "",
  followUpRemarks: "",
});

export default function QuotationManagementPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [engineerFilter, setEngineerFilter] = useState("All");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [quickPill, setQuickPill] = useState<"All" | "Open" | "Won" | "Lost" | "Overdue" | "DueToday">("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeQuotationId, setActiveQuotationId] = useState<number | null>(null);
  const [formData, setFormData] = useState<QuotationForm>(initialForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Follow-up modal state
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState<Quotation | null>(null);
  const [followUpStatus, setFollowUpStatus] = useState("Customer Contacted");
  const [followUpOrderStatus, setFollowUpOrderStatus] = useState("Open");
  const [followUpLastDate, setFollowUpLastDate] = useState("");
  const [followUpNextDate, setFollowUpNextDate] = useState("");
  const [followUpNextAction, setFollowUpNextAction] = useState("");
  const [followUpRemarks, setFollowUpRemarks] = useState("");
  const [followUpUpdatedBy, setFollowUpUpdatedBy] = useState("");
  const [followUpSaving, setFollowUpSaving] = useState(false);

  // View Details Modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/quotations");
      if (!res.ok) throw new Error("Failed to fetch quotation records");
      const data = await res.json();
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  // Engineers list dynamically gathered
  const engineersList = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => {
      if (q.salesEngineer) set.add(q.salesEngineer);
    });
    return Array.from(set).sort();
  }, [quotations]);

  // Date comparison helpers
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isOverdue = (q: Quotation) => {
    if (q.orderStatus !== "Open" || !q.nextFollowUpDate) return false;
    const target = new Date(q.nextFollowUpDate);
    target.setHours(0, 0, 0, 0);
    return target < today;
  };

  const isDueToday = (q: Quotation) => {
    if (q.orderStatus !== "Open" || !q.nextFollowUpDate) return false;
    const target = new Date(q.nextFollowUpDate);
    target.setHours(0, 0, 0, 0);
    return target.getTime() === today.getTime();
  };

  // Top Dashboard Analytics Calculations
  const analytics = useMemo(() => {
    const totalQuotations = quotations.length;
    let totalQuotationValue = 0;
    let totalDiscountValue = 0;
    let totalPoValue = 0;
    let openCount = 0;
    let openValue = 0;
    let wonCount = 0;
    let wonValue = 0;
    let lostCount = 0;
    let lostValue = 0;
    let pendingFollowUps = 0;
    let overdueFollowUps = 0;
    let dueTodayFollowUps = 0;

    quotations.forEach((q) => {
      const val = Number(q.quotationAmount) || 0;
      const disc = Number(q.discountAmount) || 0;
      const poVal = Number(q.poAmount) || 0;
      totalQuotationValue += val;
      totalDiscountValue += disc;
      totalPoValue += poVal;

      if (q.orderStatus === "Won") {
        wonCount += 1;
        wonValue += val;
      } else if (q.orderStatus === "Lost") {
        lostCount += 1;
        lostValue += val;
      } else {
        openCount += 1;
        openValue += val;
        if (q.followUpStatus !== "On Hold") {
          pendingFollowUps += 1;
        }
      }

      if (isOverdue(q)) overdueFollowUps += 1;
      if (isDueToday(q)) dueTodayFollowUps += 1;
    });

    return {
      totalQuotations,
      totalQuotationValue,
      totalDiscountValue,
      totalPoValue,
      openCount,
      openValue,
      wonCount,
      wonValue,
      lostCount,
      lostValue,
      pendingFollowUps,
      overdueFollowUps,
      dueTodayFollowUps,
    };
  }, [quotations, today]);

  // Compute next financial year quotation number based on existing quotations
  const computeNextQuotationNumber = (dateStr?: string) => {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const targetFY = getFinancialYearString(targetDate);
    // Count how many quotations exist for this FY
    const countInFY = quotations.filter((q) => {
      const qFY = getFinancialYearString(q.quotationDate);
      return qFY === targetFY;
    }).length;

    return generateFinancialYearQuotationNumber(countInFY + 1, targetDate);
  };

  // Filtered quotations list
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // Quick pill filter
      if (quickPill === "Open" && q.orderStatus !== "Open") return false;
      if (quickPill === "Won" && q.orderStatus !== "Won") return false;
      if (quickPill === "Lost" && q.orderStatus !== "Lost") return false;
      if (quickPill === "Overdue" && !isOverdue(q)) return false;
      if (quickPill === "DueToday" && !isDueToday(q)) return false;

      // Dropdown filters
      if (engineerFilter !== "All" && q.salesEngineer !== engineerFilter) return false;
      if (orderStatusFilter !== "All" && q.orderStatus !== orderStatusFilter) return false;
      if (followUpStatusFilter !== "All" && q.followUpStatus !== followUpStatusFilter) return false;
      if (regionFilter !== "All" && q.region !== regionFilter) return false;

      // Date range filter
      if (fromDate) {
        const qDate = new Date(q.quotationDate).toISOString().split("T")[0];
        if (qDate < fromDate) return false;
      }
      if (toDate) {
        const qDate = new Date(q.quotationDate).toISOString().split("T")[0];
        if (qDate > toDate) return false;
      }

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const num = (q.quotationNumber || "").toLowerCase();
        const cust = (q.customerName || "").toLowerCase();
        const comp = (q.companyName || "").toLowerCase();
        const phone = (q.customerPhone || "").toLowerCase();
        const email = (q.customerEmail || "").toLowerCase();
        const prod = (q.productModel || "").toLowerCase();
        const eng = (q.salesEngineer || "").toLowerCase();
        const reg = (q.region || "").toLowerCase();
        const loc = (q.location || "").toLowerCase();
        const made = (q.quotationMadeBy || "").toLowerCase();
        return (
          num.includes(query) ||
          cust.includes(query) ||
          comp.includes(query) ||
          phone.includes(query) ||
          email.includes(query) ||
          prod.includes(query) ||
          eng.includes(query) ||
          reg.includes(query) ||
          loc.includes(query) ||
          made.includes(query)
        );
      }

      return true;
    });
  }, [
    quotations,
    quickPill,
    engineerFilter,
    orderStatusFilter,
    followUpStatusFilter,
    regionFilter,
    fromDate,
    toDate,
    search,
  ]);

  // Open Add modal with auto Financial Year Quotation number
  const handleOpenAdd = () => {
    setIsEditing(false);
    setActiveQuotationId(null);
    const todayStr = new Date().toISOString().split("T")[0];
    const defaultNumber = computeNextQuotationNumber(todayStr);
    const form = initialForm(defaultNumber);
    setFormData(form);
    setFormError(null);
    setFormModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (q: Quotation) => {
    setIsEditing(true);
    setActiveQuotationId(q.id);
    setFormData({
      quotationNumber: q.quotationNumber,
      quotationDate: toInputDate(q.quotationDate),
      customerName: q.customerName || "",
      companyName: q.companyName || "",
      customerPhone: q.customerPhone || "",
      customerEmail: q.customerEmail || "",
      salesEngineer: q.salesEngineer || "",
      productModel: q.productModel || "",
      quotationAmount: q.quotationAmount ?? "",
      discountAmount: q.discountAmount ?? "",
      poAmount: q.poAmount ?? "",
      region: q.region || "West",
      location: q.location || "",
      quotationMadeBy: q.quotationMadeBy || "",
      orderStatus: q.orderStatus || "Open",
      followUpStatus: q.followUpStatus || "Not Started",
      nextFollowUpDate: toInputDate(q.nextFollowUpDate),
      nextAction: q.nextAction || "",
      followUpRemarks: q.followUpRemarks || "",
    });
    setFormError(null);
    setFormModalOpen(true);
  };

  // Save Quotation (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.quotationNumber.trim()) {
      setFormError("Quotation Number is required");
      return;
    }
    if (!formData.customerName.trim()) {
      setFormError("Customer Name is required");
      return;
    }
    if (!formData.salesEngineer.trim()) {
      setFormError("Sales Engineer is required");
      return;
    }
    if (!formData.productModel.trim()) {
      setFormError("Product / Model is required");
      return;
    }
    if (formData.quotationAmount === "" || Number(formData.quotationAmount) < 0) {
      setFormError("Valid QT Amount (INR) is required");
      return;
    }

    try {
      setSaving(true);
      const url = isEditing && activeQuotationId ? `/api/quotations/${activeQuotationId}` : "/api/quotations";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quotationAmount: Number(formData.quotationAmount),
          discountAmount: formData.discountAmount === "" ? 0 : Number(formData.discountAmount),
          poAmount: formData.poAmount === "" ? 0 : Number(formData.poAmount),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to save quotation");
      }

      setFormModalOpen(false);
      fetchQuotations();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  // Open Quick Follow-up modal
  const handleOpenFollowUp = (q: Quotation) => {
    setFollowUpTarget(q);
    setFollowUpStatus(q.followUpStatus);
    setFollowUpOrderStatus(q.orderStatus);
    setFollowUpLastDate(new Date().toISOString().split("T")[0]);
    setFollowUpNextDate(toInputDate(q.nextFollowUpDate));
    setFollowUpNextAction(q.nextAction || "");
    setFollowUpRemarks("");
    setFollowUpUpdatedBy(q.salesEngineer || "");
    setFollowUpModalOpen(true);
  };

  // Submit Follow-up update
  const handleSubmitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTarget) return;

    try {
      setFollowUpSaving(true);
      const res = await fetch(`/api/quotations/${followUpTarget.id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpStatus,
          orderStatus: followUpOrderStatus,
          lastFollowUpDate: followUpLastDate || new Date().toISOString(),
          nextFollowUpDate: followUpNextDate || null,
          nextAction: followUpNextAction,
          remarks: followUpRemarks,
          updatedBy: followUpUpdatedBy,
        }),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.error || "Failed to update follow-up");
      }

      setFollowUpModalOpen(false);
      fetchQuotations();

      if (viewQuotation && viewQuotation.id === followUpTarget.id) {
        setViewQuotation(updated);
      }
    } catch (err: any) {
      alert(err.message || "Could not update follow-up");
    } finally {
      setFollowUpSaving(false);
    }
  };

  // Open View Details Modal
  const handleOpenView = async (q: Quotation) => {
    setViewQuotation(q);
    setViewModalOpen(true);
    try {
      const res = await fetch(`/api/quotations/${q.id}`);
      if (res.ok) {
        const full = await res.json();
        setViewQuotation(full);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/quotations/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete quotation");
      setDeleteId(null);
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || "Could not delete quotation");
    }
  };

  // Export to Excel with separate columns
  const handleExport = () => {
    exportQuotationsToExcel(filteredQuotations, "Quotations_Management_Report");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Quotation Management System
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Track quotations, follow-up lifecycles, engineer pipeline & conversions
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
            title="Download formatted Excel spreadsheet with separate columns for Customer Name, Company, Mobile No, Email, Region, Location, QT Amount (INR), Discount Amount (INR), PO Amount (INR), and Quotation Made By as the last column"
          >
            <Download size={16} />
            Export to Excel
          </button>

          <Button onClick={handleOpenAdd} className="!rounded-xl !py-2.5 !text-xs !shadow-md shadow-blue-500/20">
            <Plus size={16} />
            Add Quotation
          </Button>
        </div>
      </div>

      {/* 1. Dashboard Analytics Cards (Top Section) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {/* Card 1: Total Quotations */}
        <div
          onClick={() => {
            setQuickPill("All");
            setOrderStatusFilter("All");
          }}
          className={`group cursor-pointer rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            quickPill === "All" && orderStatusFilter === "All"
              ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Quotes</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileSpreadsheet size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{analytics.totalQuotations}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">All recorded quotes</p>
        </div>

        {/* Card 2: Total Quotation Value (INR) */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/60 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Total QT Value</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <TrendingUp size={16} />
            </span>
          </div>
          <p className="mt-2 text-xl font-black tracking-tight text-indigo-950 truncate" title={formatINR(analytics.totalQuotationValue)}>
            {formatINR(analytics.totalQuotationValue)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-indigo-600">Combined pipeline</p>
        </div>

        {/* Card 3: Open Quotations */}
        <div
          onClick={() => {
            setQuickPill("Open");
            setOrderStatusFilter("Open");
          }}
          className={`group cursor-pointer rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            quickPill === "Open"
              ? "border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">Open Quotes</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Clock size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-sky-950">{analytics.openCount}</p>
          <p className="mt-1 text-[11px] font-medium text-sky-700 truncate">{formatINR(analytics.openValue)}</p>
        </div>

        {/* Card 4: Won Quotations */}
        <div
          onClick={() => {
            setQuickPill("Won");
            setOrderStatusFilter("Won");
          }}
          className={`group cursor-pointer rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            quickPill === "Won"
              ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Won Orders</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-950">{analytics.wonCount}</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-700 truncate">{formatINR(analytics.wonValue)}</p>
        </div>

        {/* Card 5: Lost Quotations */}
        <div
          onClick={() => {
            setQuickPill("Lost");
            setOrderStatusFilter("Lost");
          }}
          className={`group cursor-pointer rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            quickPill === "Lost"
              ? "border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Lost</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <XCircle size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-rose-950">{analytics.lostCount}</p>
          <p className="mt-1 text-[11px] font-medium text-rose-700 truncate">{formatINR(analytics.lostValue)}</p>
        </div>

        {/* Card 6: Pending Follow-ups */}
        <div
          onClick={() => {
            setQuickPill("Open");
            setFollowUpStatusFilter("Follow-up Pending");
          }}
          className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending F/U</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <MessageSquare size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-amber-950">{analytics.pendingFollowUps}</p>
          <p className="mt-1 text-[11px] font-medium text-amber-700">Require engagement</p>
        </div>

        {/* Card 7: Overdue Follow-ups */}
        <div
          onClick={() => {
            setQuickPill("Overdue");
          }}
          className={`group cursor-pointer rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            quickPill === "Overdue"
              ? "border-red-600 bg-red-100/60 ring-2 ring-red-500/30"
              : analytics.overdueFollowUps > 0
              ? "border-red-300 bg-red-50/70"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Overdue</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <AlertTriangle size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-red-700">{analytics.overdueFollowUps}</p>
          <p className="mt-1 text-[11px] font-bold text-red-600">
            {analytics.overdueFollowUps > 0 ? "Immediate Action!" : "All up to date"}
          </p>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Top row: Search and Quick Filter Pills */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search by Quotation No, Customer, Company, Mobile, Email, Product, Engineer, Location, Made By..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "All", id: "All" },
                { label: "Open", id: "Open", count: analytics.openCount },
                { label: "Won", id: "Won", count: analytics.wonCount },
                { label: "Lost", id: "Lost", count: analytics.lostCount },
                { label: "Due Today", id: "DueToday", count: analytics.dueTodayFollowUps, highlight: true },
                { label: "Overdue", id: "Overdue", count: analytics.overdueFollowUps, alert: true },
              ].map((pill: any) => {
                const active = quickPill === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => {
                      setQuickPill(pill.id);
                      if (pill.id === "Open" || pill.id === "Won" || pill.id === "Lost") {
                        setOrderStatusFilter(pill.id);
                      } else {
                        setOrderStatusFilter("All");
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : pill.alert && pill.count > 0
                        ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        : pill.highlight && pill.count > 0
                        ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {pill.label}
                    {pill.count !== undefined && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          active
                            ? "bg-white/20 text-white"
                            : pill.alert && pill.count > 0
                            ? "bg-red-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {pill.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom row: Filter Dropdowns */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 sm:grid-cols-3 lg:grid-cols-6">
            {/* Filter by Engineer */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Engineer</label>
              <select
                value={engineerFilter}
                onChange={(e) => setEngineerFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="All">All Engineers</option>
                {engineersList.map((eng) => (
                  <option key={eng} value={eng}>
                    {eng}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Order Status */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Status</label>
              <select
                value={orderStatusFilter}
                onChange={(e) => {
                  setOrderStatusFilter(e.target.value);
                  if (e.target.value !== "All") setQuickPill(e.target.value as any);
                  else setQuickPill("All");
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="All">All Order Statuses</option>
                {QUOTATION_ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Follow-up Status */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Follow-up Status</label>
              <select
                value={followUpStatusFilter}
                onChange={(e) => setFollowUpStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="All">All Follow-ups</option>
                {QUOTATION_FOLLOWUP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Region */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Region</label>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="All">All Regions</option>
                {QUOTATION_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            {/* To Date + Reset */}
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
              {(search ||
                engineerFilter !== "All" ||
                orderStatusFilter !== "All" ||
                followUpStatusFilter !== "All" ||
                regionFilter !== "All" ||
                quickPill !== "All" ||
                fromDate ||
                toDate) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setEngineerFilter("All");
                    setOrderStatusFilter("All");
                    setFollowUpStatusFilter("All");
                    setRegionFilter("All");
                    setQuickPill("All");
                    setFromDate("");
                    setToDate("");
                  }}
                  className="mb-0.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                  title="Clear all filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Manage Quotations - Distinct Separate Columns Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              Quotation Records ({filteredQuotations.length})
            </h2>
            {filteredQuotations.length !== quotations.length && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                Filtered from {quotations.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchQuotations}
            disabled={loading}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
            <p className="text-xs font-semibold text-slate-500">Loading quotations...</p>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">No quotations found</p>
              <p className="text-xs text-slate-500">
                {quotations.length === 0
                  ? "Get started by adding your first quotation record."
                  : "Try clearing filters to see more results."}
              </p>
            </div>
            {quotations.length === 0 && (
              <Button onClick={handleOpenAdd} size="sm" className="mt-2">
                <Plus size={15} /> Add First Quotation
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3.5 py-3.5">Quotation No & Date</th>
                  {/* Separate Customer Name */}
                  <th className="px-3.5 py-3.5">Customer Name</th>
                  {/* Separate Company Name */}
                  <th className="px-3.5 py-3.5">Company Name</th>
                  {/* Separate Mobile No */}
                  <th className="px-3.5 py-3.5">Mobile No</th>
                  {/* Separate Email */}
                  <th className="px-3.5 py-3.5">Email</th>
                  {/* Product / Model */}
                  <th className="px-3.5 py-3.5">Product / Model</th>
                  {/* QT Amount (INR) */}
                  <th className="px-3.5 py-3.5 text-right font-black text-slate-900 bg-slate-50/60">
                    QT Amount (INR)
                  </th>
                  {/* Discount Amount (INR) */}
                  <th className="px-3.5 py-3.5 text-right font-bold text-slate-700">
                    Discount Amount (INR)
                  </th>
                  {/* PO Amount (INR) */}
                  <th className="px-3.5 py-3.5 text-right font-bold text-slate-700">
                    PO Amount (INR)
                  </th>
                  {/* Separate Region */}
                  <th className="px-3.5 py-3.5">Region</th>
                  {/* Separate Location */}
                  <th className="px-3.5 py-3.5">Location</th>
                  {/* Sales Engineer */}
                  <th className="px-3.5 py-3.5">Sales Engineer</th>
                  {/* Order Status */}
                  <th className="px-3.5 py-3.5">Order Status</th>
                  {/* Follow-up Status */}
                  <th className="px-3.5 py-3.5">Follow-up Status</th>
                  {/* Next Follow-up */}
                  <th className="px-3.5 py-3.5">Next Follow-up</th>
                  {/* Quotation Made By (LAST COLUMN as requested) */}
                  <th className="px-3.5 py-3.5 bg-blue-50 text-blue-950 font-bold border-l border-blue-100">
                    Quotation Made By
                  </th>
                  <th className="px-3.5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredQuotations.map((q) => {
                  const overdue = isOverdue(q);
                  const dueToday = isDueToday(q);

                  return (
                    <tr
                      key={q.id}
                      className={`group transition hover:bg-slate-50/80 ${
                        overdue
                          ? "bg-rose-50/30 border-l-4 border-l-red-500"
                          : dueToday
                          ? "bg-amber-50/30 border-l-4 border-l-amber-500"
                          : ""
                      }`}
                    >
                      {/* Quotation No & Date */}
                      <td className="px-3.5 py-3.5">
                        <button
                          onClick={() => handleOpenView(q)}
                          className="font-bold text-blue-600 hover:underline hover:text-blue-800"
                        >
                          {q.quotationNumber}
                        </button>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar size={11} />
                          {formatDate(q.quotationDate)}
                        </div>
                      </td>

                      {/* Separate Customer Name */}
                      <td className="px-3.5 py-3.5">
                        <span className="font-bold text-slate-900">{q.customerName || "—"}</span>
                      </td>

                      {/* Separate Company Name */}
                      <td className="px-3.5 py-3.5">
                        <span className="text-slate-800 font-semibold">{q.companyName || "—"}</span>
                      </td>

                      {/* Separate Mobile No */}
                      <td className="px-3.5 py-3.5">
                        {q.customerPhone ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            <Phone size={12} className="text-slate-400" />
                            <span>{q.customerPhone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Separate Email */}
                      <td className="px-3.5 py-3.5">
                        {q.customerEmail ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            <Mail size={12} className="text-slate-400" />
                            <span>{q.customerEmail}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Product / Model */}
                      <td className="px-3.5 py-3.5">
                        <span className="font-semibold text-slate-800 max-w-[200px] truncate block" title={q.productModel}>
                          {q.productModel}
                        </span>
                      </td>

                      {/* QT Amount (INR) */}
                      <td className="px-3.5 py-3.5 text-right bg-slate-50/40">
                        <span className="font-black text-slate-900">
                          {formatINR(q.quotationAmount)}
                        </span>
                      </td>

                      {/* Discount Amount (INR) */}
                      <td className="px-3.5 py-3.5 text-right">
                        {q.discountAmount && q.discountAmount > 0 ? (
                          <span className="font-semibold text-rose-600">
                            {formatINR(q.discountAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* PO Amount (INR) */}
                      <td className="px-3.5 py-3.5 text-right">
                        {q.poAmount && q.poAmount > 0 ? (
                          <span className="font-black text-emerald-700">
                            {formatINR(q.poAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Separate Region */}
                      <td className="px-3.5 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {q.region || "West"}
                        </span>
                      </td>

                      {/* Separate Location */}
                      <td className="px-3.5 py-3.5">
                        {q.location ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            <MapPin size={12} className="text-slate-400" />
                            <span>{q.location}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Sales Engineer */}
                      <td className="px-3.5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                            {q.salesEngineer ? q.salesEngineer[0].toUpperCase() : "E"}
                          </span>
                          <span className="font-semibold text-slate-800">{q.salesEngineer}</span>
                        </div>
                      </td>

                      {/* Order Status */}
                      <td className="px-3.5 py-3.5">
                        <StatusBadge status={q.orderStatus} compact />
                      </td>

                      {/* Follow-up Status */}
                      <td className="px-3.5 py-3.5">
                        <div>
                          <StatusBadge status={q.followUpStatus} compact />
                          {q.nextAction && (
                            <p className="mt-1 text-[10px] font-medium text-slate-500 truncate max-w-[170px]" title={q.nextAction}>
                              <strong>Next:</strong> {q.nextAction}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Next Follow-up Date */}
                      <td className="px-3.5 py-3.5">
                        {q.nextFollowUpDate ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {formatDate(q.nextFollowUpDate)}
                            </span>
                            {overdue && (
                              <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-black text-red-700">
                                <AlertTriangle size={10} />
                                Overdue
                              </div>
                            )}
                            {dueToday && (
                              <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                                <Clock size={10} />
                                Due Today
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Quotation Made By (LAST COLUMN as specifically requested) */}
                      <td className="px-3.5 py-3.5 bg-blue-50/40 border-l border-blue-100">
                        <div className="flex items-center gap-1 text-slate-900 font-bold">
                          <User size={13} className="text-blue-600" />
                          <span>{q.quotationMadeBy || "—"}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Follow-up update button */}
                          <button
                            onClick={() => handleOpenFollowUp(q)}
                            className="rounded-lg bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                            title="Update Follow-up Status & Remarks"
                          >
                            <MessageSquare size={15} />
                          </button>

                          {/* View details */}
                          <button
                            onClick={() => handleOpenView(q)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            title="View Quotation Details"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(q)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                            title="Edit Quotation"
                          >
                            <Pencil size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteId(q.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Add / Edit Quotation Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={isEditing ? `Edit Quotation: ${formData.quotationNumber}` : "Add New Quotation"}
        size="xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {formError}
            </div>
          )}

          {/* Section 1: Quotation Identification & FY */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Quotation Identification & Financial Year
            </h3>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Quotation Number */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Quotation Number <span className="text-red-500">*</span>
                  </label>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        const num = computeNextQuotationNumber(formData.quotationDate);
                        setFormData((prev) => ({ ...prev, quotationNumber: num }));
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Reset FY No
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. QT/24-25/001"
                  value={formData.quotationNumber}
                  onChange={(e) => setFormData({ ...formData, quotationNumber: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  FY: <strong>{getFinancialYearString(formData.quotationDate)}</strong> (Auto-formatted by financial year)
                </p>
              </div>

              {/* Quotation Date */}
              <div>
                <label className="text-xs font-bold text-slate-700">
                  Quotation Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.quotationDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      quotationDate: newDate,
                      // Automatically update FY quotation number if in create mode and number matches pattern
                      quotationNumber:
                        !isEditing && (!prev.quotationNumber || prev.quotationNumber.startsWith("QT/"))
                          ? computeNextQuotationNumber(newDate)
                          : prev.quotationNumber,
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Sales Engineer */}
              <div>
                <label className="text-xs font-bold text-slate-700">
                  Sales Engineer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amit Verma"
                  value={formData.salesEngineer}
                  onChange={(e) => setFormData({ ...formData, salesEngineer: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Customer Name, Company Name, Mobile & Email (ALAG ALAG) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Customer & Company Details (Separate Fields)
            </h3>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Customer Name */}
              <div>
                <label className="text-xs font-bold text-slate-700">
                  Customer Name (Contact Person) <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Company Name */}
              <div>
                <label className="text-xs font-bold text-slate-700">Company Name / Organization</label>
                <div className="relative mt-1">
                  <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="e.g. Tata Motors Ltd / BHEL"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Mobile No */}
              <div>
                <label className="text-xs font-bold text-slate-700">Mobile No / Contact</label>
                <div className="relative mt-1">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="e.g. +91 98201 12345"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="email"
                    placeholder="e.g. r.sharma@tatamotors.com"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Product & Commercials (QT Amount INR, Discount Amount INR, PO Amount INR) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Product & Commercial Amounts (in INR)
            </h3>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Product / Model */}
              <div className="sm:col-span-3">
                <label className="text-xs font-bold text-slate-700">
                  Product / Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Videoscope VT-4000 (4-Way Articulation)"
                  value={formData.productModel}
                  onChange={(e) => setFormData({ ...formData, productModel: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* QT Amount (INR) */}
              <div>
                <label className="text-xs font-bold text-slate-800">
                  QT Amount (INR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.quotationAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quotationAmount: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
                {formData.quotationAmount !== "" && (
                  <p className="mt-1 text-[11px] font-bold text-emerald-600">
                    Preview: {formatINR(Number(formData.quotationAmount))}
                  </p>
                )}
              </div>

              {/* Discount Amount (INR) - Non-mandatory */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Discount Amount (INR)</label>
                  <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00 (Optional)"
                  value={formData.discountAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountAmount: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
                {formData.discountAmount !== "" && Number(formData.discountAmount) > 0 && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600">
                    Discount: {formatINR(Number(formData.discountAmount))}
                  </p>
                )}
              </div>

              {/* PO Amount (INR) - Non-mandatory */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">PO Amount (INR)</label>
                  <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00 (Optional)"
                  value={formData.poAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      poAmount: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
                {formData.poAmount !== "" && Number(formData.poAmount) > 0 && (
                  <p className="mt-1 text-[11px] font-bold text-emerald-700">
                    PO Value: {formatINR(Number(formData.poAmount))}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Region, Location & Quotation Made By */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              4. Region, Location & Creator
            </h3>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Region */}
              <div>
                <label className="text-xs font-bold text-slate-700">Region</label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                >
                  {QUOTATION_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-bold text-slate-700">Location (City / State)</label>
                <input
                  type="text"
                  placeholder="e.g. Pune, Maharashtra"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Quotation Made By */}
              <div>
                <label className="text-xs font-bold text-blue-900">Quotation Made By</label>
                <input
                  type="text"
                  placeholder="e.g. Jyotika Sharma"
                  value={formData.quotationMadeBy}
                  onChange={(e) => setFormData({ ...formData, quotationMadeBy: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Status & Follow-up Planning */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              5. Status & Follow-up Planning
            </h3>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Order Status */}
              <div>
                <label className="text-xs font-bold text-slate-700">Order Status</label>
                <select
                  value={formData.orderStatus}
                  onChange={(e) => setFormData({ ...formData, orderStatus: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                >
                  {QUOTATION_ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Follow-up Status */}
              <div>
                <label className="text-xs font-bold text-slate-700">Follow-up Status</label>
                <select
                  value={formData.followUpStatus}
                  onChange={(e) => setFormData({ ...formData, followUpStatus: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                >
                  {QUOTATION_FOLLOWUP_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Next Follow-up Date */}
              <div>
                <label className="text-xs font-bold text-slate-700">Next Follow-up Date</label>
                <input
                  type="date"
                  value={formData.nextFollowUpDate}
                  onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Next Action Plan */}
              <div>
                <label className="text-xs font-bold text-slate-700">Next Action Plan</label>
                <input
                  type="text"
                  placeholder="e.g. Arrange product demo / submit compliance"
                  value={formData.nextAction}
                  onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Initial Remarks */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Follow-up Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Add any specific customer requirements, discount terms, or conversation notes..."
                  value={formData.followUpRemarks}
                  onChange={(e) => setFormData({ ...formData, followUpRemarks: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Update Quotation" : "Save Quotation"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Dedicated Follow-up Update Modal */}
      <Modal
        isOpen={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        title={followUpTarget ? `Update Follow-up: ${followUpTarget.quotationNumber}` : "Update Follow-up"}
        size="lg"
      >
        {followUpTarget && (
          <form onSubmit={handleSubmitFollowUp} className="space-y-4">
            {/* Quick Context Header */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">{followUpTarget.customerName}</p>
                  {followUpTarget.companyName && (
                    <p className="text-[11px] font-semibold text-slate-700">{followUpTarget.companyName}</p>
                  )}
                  <p className="text-[11px] text-slate-500">{followUpTarget.productModel}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-blue-700">{formatINR(followUpTarget.quotationAmount)}</p>
                  <div className="mt-0.5 flex items-center gap-1.5 justify-end">
                    <StatusBadge status={followUpTarget.orderStatus} compact />
                    <StatusBadge status={followUpTarget.followUpStatus} compact />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Follow-up Status */}
              <div>
                <label className="text-xs font-bold text-slate-700">Follow-up Status</label>
                <select
                  value={followUpStatus}
                  onChange={(e) => setFollowUpStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                >
                  {QUOTATION_FOLLOWUP_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Status */}
              <div>
                <label className="text-xs font-bold text-slate-700">Order Status</label>
                <select
                  value={followUpOrderStatus}
                  onChange={(e) => setFollowUpOrderStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                >
                  {QUOTATION_ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Last Follow-up Date */}
              <div>
                <label className="text-xs font-bold text-slate-700">Date of Follow-up</label>
                <input
                  type="date"
                  value={followUpLastDate}
                  onChange={(e) => setFollowUpLastDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Next Follow-up Date */}
              <div>
                <label className="text-xs font-bold text-slate-700">Next Follow-up Date</label>
                <input
                  type="date"
                  value={followUpNextDate}
                  onChange={(e) => setFollowUpNextDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Next Action */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Next Action Plan</label>
                <input
                  type="text"
                  placeholder="e.g. Call client purchase head / send technical compliance sheet"
                  value={followUpNextAction}
                  onChange={(e) => setFollowUpNextAction(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Follow-up Remarks */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Follow-up Remarks / Meeting Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter detailed outcome of interaction, customer feedback, negotiated terms, etc."
                  value={followUpRemarks}
                  onChange={(e) => setFollowUpRemarks(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Updated By */}
              <div>
                <label className="text-xs font-bold text-slate-700">Logged By</label>
                <input
                  type="text"
                  placeholder="Sales Engineer Name"
                  value={followUpUpdatedBy}
                  onChange={(e) => setFollowUpUpdatedBy(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <p className="text-[11px] font-medium text-slate-500">
              💡 Follow-up updates append to the historical activity timeline without overwriting master quotation numbers or pricing.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFollowUpModalOpen(false)}
                disabled={followUpSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={followUpSaving}>
                {followUpSaving ? "Updating..." : "Save Follow-up Update"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 6. View Details Modal with Timeline */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={viewQuotation ? `Quotation Details: ${viewQuotation.quotationNumber}` : "Quotation Details"}
        size="xl"
      >
        {viewQuotation && (
          <div className="space-y-5">
            {/* Top Overview Banner */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  {viewQuotation.quotationNumber}
                </span>
                <h3 className="text-xl font-black text-slate-900">{viewQuotation.customerName}</h3>
                {viewQuotation.companyName && (
                  <p className="text-xs font-bold text-slate-700">{viewQuotation.companyName}</p>
                )}
                <p className="text-xs text-slate-500">
                  Quotation Date: {formatDate(viewQuotation.quotationDate)}
                </p>
              </div>

              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <span className="text-2xl font-black text-slate-900">
                  {formatINR(viewQuotation.quotationAmount)}
                </span>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={viewQuotation.orderStatus} />
                  <StatusBadge status={viewQuotation.followUpStatus} />
                </div>
              </div>
            </div>

            {/* Separate Attributes Grid */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Name</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800">{viewQuotation.customerName || "—"}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Company Name</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800">{viewQuotation.companyName || "—"}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile No</span>
                <p className="mt-0.5 text-xs font-semibold text-slate-800">{viewQuotation.customerPhone || "—"}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</span>
                <p className="mt-0.5 text-xs font-semibold text-slate-800 truncate" title={viewQuotation.customerEmail || ""}>
                  {viewQuotation.customerEmail || "—"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">QT Amount (INR)</span>
                <p className="mt-0.5 text-xs font-black text-slate-900">{formatINR(viewQuotation.quotationAmount)}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Discount Amount (INR)</span>
                <p className="mt-0.5 text-xs font-bold text-rose-600">
                  {viewQuotation.discountAmount ? formatINR(viewQuotation.discountAmount) : "—"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PO Amount (INR)</span>
                <p className="mt-0.5 text-xs font-black text-emerald-700">
                  {viewQuotation.poAmount ? formatINR(viewQuotation.poAmount) : "—"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Quotation Made By</span>
                <p className="mt-0.5 text-xs font-black text-blue-900">{viewQuotation.quotationMadeBy || "—"}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product / Model</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800">{viewQuotation.productModel}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Engineer</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800">{viewQuotation.salesEngineer}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Region</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800">{viewQuotation.region || "West"}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800">{viewQuotation.location || "—"}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next Follow-up</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800">
                  {viewQuotation.nextFollowUpDate ? formatDate(viewQuotation.nextFollowUpDate) : "—"}
                </p>
              </div>

              <div className="col-span-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next Action</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800">{viewQuotation.nextAction || "—"}</p>
              </div>
            </div>

            {/* Follow-up Timeline History */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Follow-up Activity Timeline ({viewQuotation.followUps?.length || 0})
                </h4>
                <button
                  onClick={() => {
                    handleOpenFollowUp(viewQuotation);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100"
                >
                  <MessageSquare size={13} />
                  Log New Follow-up
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {viewQuotation.followUps && viewQuotation.followUps.length > 0 ? (
                  viewQuotation.followUps.map((log, idx) => (
                    <div key={log.id || idx} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200 last:before:hidden">
                      <span className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{formatDate(log.followUpDate)}</span>
                            <StatusBadge status={log.followUpStatus} compact />
                            {log.orderStatus && <StatusBadge status={log.orderStatus} compact />}
                          </div>
                          {log.updatedBy && (
                            <span className="text-[11px] font-medium text-slate-400">by {log.updatedBy}</span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-700">{log.remarks}</p>
                        {log.nextAction && (
                          <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] font-medium text-slate-600">
                            <strong>Next Action:</strong> {log.nextAction}{" "}
                            {log.nextFollowUpDate && <span>(Target: {formatDate(log.nextFollowUpDate)})</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No follow-up history logged yet. Use the "Log New Follow-up" button to record activity.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setViewModalOpen(false);
                  handleOpenEdit(viewQuotation);
                }}
              >
                <Pencil size={14} /> Edit Quotation Master
              </Button>

              <Button size="sm" onClick={() => setViewModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 7. Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete" size="md">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete this quotation? This will permanently remove the record and its follow-up history.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
              Delete Quotation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
