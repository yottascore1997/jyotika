"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Trophy, Ban, FileX, ClipboardCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import TenderDocumentUpload, {
  type PendingTenderDocument,
  type TenderDocumentRecord,
} from "@/components/tender/TenderDocumentUpload";
import { TENDER_STATUSES, TENDER_TYPES, YES_NO_OPTIONS } from "@/lib/constants";
import type { TenderDocType } from "@/lib/tender-documents";
import { formatCurrency, formatDate, toInputDate } from "@/lib/utils";

type Tender = {
  id: number;
  organizationName: string;
  location: string;
  tenderBidNo: string;
  tenderSubmittedDate: string;
  quotedProduct: string;
  orderValue: number;
  status: string;
  statusAsOnDate: string;
  fixedRa: string;
  miiPreference: string;
  tenderType: string;
  documents?: TenderDocumentRecord[];
};

const emptyForm = () => ({
  organizationName: "",
  location: "",
  tenderBidNo: "",
  tenderSubmittedDate: new Date().toISOString().split("T")[0],
  quotedProduct: "",
  orderValue: 0,
  status: "Tender Filled Up",
  statusAsOnDate: "",
  fixedRa: YES_NO_OPTIONS[1],
  miiPreference: YES_NO_OPTIONS[1],
  tenderType: TENDER_TYPES[0],
});

const STATUS_CARDS = [
  { status: "Tender Win", icon: Trophy, color: "bg-emerald-100 text-emerald-700", valueColor: "text-emerald-700" },
  { status: "Tender Filled Up", icon: ClipboardCheck, color: "bg-sky-100 text-sky-700", valueColor: "text-sky-700" },
  { status: "Total Disqualified", icon: Ban, color: "bg-orange-100 text-orange-700", valueColor: "text-orange-700", combined: ["Technically Disqualified", "Commercially Disqualified"] as const },
  { status: "Tender Canceled", icon: FileX, color: "bg-rose-100 text-rose-700", valueColor: "text-rose-700" },
] as const;

export default function TenderPage() {
  const [rows, setRows] = useState<Tender[]>([]);
  const [modal, setModal] = useState(false);
  const [viewItem, setViewItem] = useState<Tender | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [existingDocs, setExistingDocs] = useState<TenderDocumentRecord[]>([]);
  const [pendingDocs, setPendingDocs] = useState<PendingTenderDocument[]>([]);
  const [removedDocIds, setRemovedDocIds] = useState<number[]>([]);

  const resetDocState = () => {
    setExistingDocs([]);
    setPendingDocs([]);
    setRemovedDocIds([]);
  };

  const uploadTenderDocuments = async (tenderId: number) => {
    for (const docId of removedDocIds) {
      const res = await fetch(`/api/tenders/${tenderId}/documents?documentId=${docId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error((await res.json()).error || "Failed to remove document");
      }
    }

    for (const pending of pendingDocs) {
      const formData = new FormData();
      formData.append("docType", pending.docType);
      formData.append("file", pending.file);
      const res = await fetch(`/api/tenders/${tenderId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error((await res.json()).error || "Failed to upload document");
      }
    }
  };

  const load = async () => {
    const res = await fetch("/api/tenders");
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error("Failed to load tenders:", data?.error || data);
      setRows([]);
      return;
    }
    setRows(data);
  };
  useEffect(() => { load(); }, []);

  const statusStats = useMemo(() => {
    const stats: Record<string, { count: number; value: number }> = {};
    TENDER_STATUSES.forEach((s) => { stats[s] = { count: 0, value: 0 }; });
    rows.forEach((row) => {
      if (stats[row.status]) {
        stats[row.status].count += 1;
        stats[row.status].value += row.orderValue;
      }
    });
    return stats;
  }, [rows]);

  const disqualifiedStats = useMemo(() => ({
    count:
      (statusStats["Technically Disqualified"]?.count || 0) +
      (statusStats["Commercially Disqualified"]?.count || 0),
    value:
      (statusStats["Technically Disqualified"]?.value || 0) +
      (statusStats["Commercially Disqualified"]?.value || 0),
  }), [statusStats]);

  const removePendingDoc = (docType: TenderDocType) => {
    setPendingDocs((prev) => prev.filter((d) => d.docType !== docType));
  };

  const closeModal = () => {
    resetDocState();
    setModal(false);
  };

  const openCreate = () => {
    setEditId(null);
    resetDocState();
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = (row: Tender) => {
    setEditId(row.id);
    resetDocState();
    setExistingDocs(row.documents || []);
    setForm({
      organizationName: row.organizationName,
      location: row.location,
      tenderBidNo: row.tenderBidNo,
      tenderSubmittedDate: toInputDate(row.tenderSubmittedDate),
      quotedProduct: row.quotedProduct,
      orderValue: row.orderValue,
      status: row.status,
      statusAsOnDate: row.statusAsOnDate,
      fixedRa: row.fixedRa || YES_NO_OPTIONS[1],
      miiPreference: row.miiPreference || YES_NO_OPTIONS[1],
      tenderType: row.tenderType || TENDER_TYPES[0],
    });
    setModal(true);
  };

  const save = async () => {
    if (saving) return;
    if (!form.organizationName || !form.tenderBidNo || !form.quotedProduct) {
      alert("Organization name, tender bid no, and quoted product are required");
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/tenders/${editId}` : "/api/tenders";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        alert((await res.json()).error);
        return;
      }

      try {
        const saved = await res.json();
        await uploadTenderDocuments(saved.id);
        closeModal();
        load();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to save documents");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this tender record?")) return;
    const res = await fetch(`/api/tenders/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else alert((await res.json()).error);
  };

  const getCardStats = (card: (typeof STATUS_CARDS)[number]) => {
    if ("combined" in card) {
      return disqualifiedStats;
    }
    return statusStats[card.status] || { count: 0, value: 0 };
  };

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="kpi-card border-blue-200 bg-blue-50/50">
          <p className="text-sm font-semibold text-slate-600">Total Tenders</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{rows.length}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {formatCurrency(rows.reduce((sum, r) => sum + r.orderValue, 0))}
          </p>
        </div>
        {STATUS_CARDS.map((card) => {
          const { count, value } = getCardStats(card);
          const Icon = card.icon;
          return (
            <div key={card.status} className="kpi-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold leading-snug text-slate-600">{card.status}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{count}</p>
                  <p className={`mt-1 text-sm font-bold ${card.valueColor}`}>{formatCurrency(value)}</p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}><Plus size={16} /> Add Tender</Button>
      </div>

      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1400px]">
          <thead>
            <tr>
              {["#", "Organization", "Location", "Tender Bid No.", "Submitted", "Product", "Order Value", "Type", "Fixed RA", "MII", "Status", "Status As On", "Actions"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="table-cell py-10 text-center text-slate-500">
                  No tender records yet. Click &quot;Add Tender&quot; to create one.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id} className="table-row">
                  <td className="table-cell w-12 text-center font-semibold text-slate-500">{index + 1}</td>
                  <td className="table-cell font-medium">{row.organizationName}</td>
                  <td className="table-cell">{row.location || "—"}</td>
                  <td className="table-cell font-mono text-sm text-blue-600">{row.tenderBidNo}</td>
                  <td className="table-cell">{formatDate(row.tenderSubmittedDate)}</td>
                  <td className="table-cell-wrap" title={row.quotedProduct}>{row.quotedProduct}</td>
                  <td className="table-cell font-semibold">{formatCurrency(row.orderValue)}</td>
                  <td className="table-cell">{row.tenderType || "—"}</td>
                  <td className="table-cell">{row.fixedRa || "—"}</td>
                  <td className="table-cell">{row.miiPreference || "—"}</td>
                  <td className="table-cell"><StatusBadge status={row.status} compact /></td>
                  <td className="table-cell-wrap" title={row.statusAsOnDate}>{row.statusAsOnDate || "—"}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button title="View" onClick={() => setViewItem(row)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100">
                        <Eye size={16} />
                      </button>
                      <button title="Edit" onClick={() => openEdit(row)} className="rounded-md p-2 text-blue-600 hover:bg-blue-50">
                        <Pencil size={16} />
                      </button>
                      <button title="Delete" onClick={() => remove(row.id)} className="rounded-md p-2 text-rose-500 hover:bg-rose-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={closeModal} title={editId ? "Edit Tender" : "Add Tender"} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Organization Name *</label>
            <input className="input-field" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Location</label>
            <input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Tender Bid No. *</label>
            <input className="input-field" value={form.tenderBidNo} onChange={(e) => setForm({ ...form, tenderBidNo: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Tender Submitted Date</label>
            <input type="date" className="input-field" value={form.tenderSubmittedDate} onChange={(e) => setForm({ ...form, tenderSubmittedDate: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="label-field">Quoted Product *</label>
            <input className="input-field" value={form.quotedProduct} onChange={(e) => setForm({ ...form, quotedProduct: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Order Value (₹)</label>
            <input type="number" className="input-field" value={form.orderValue} onChange={(e) => setForm({ ...form, orderValue: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label-field">Status *</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {TENDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Fixed RA</label>
            <select className="input-field" value={form.fixedRa} onChange={(e) => setForm({ ...form, fixedRa: e.target.value })}>
              {YES_NO_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">MII Preference</label>
            <select className="input-field" value={form.miiPreference} onChange={(e) => setForm({ ...form, miiPreference: e.target.value })}>
              {YES_NO_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Tender Type</label>
            <select className="input-field" value={form.tenderType} onChange={(e) => setForm({ ...form, tenderType: e.target.value })}>
              {TENDER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label-field">Status As On Date</label>
            <textarea
              className="input-field min-h-[90px]"
              placeholder="Enter current status details..."
              value={form.statusAsOnDate}
              onChange={(e) => setForm({ ...form, statusAsOnDate: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-5">
          <TenderDocumentUpload
            existing={existingDocs}
            pending={pendingDocs}
            removedIds={removedDocIds}
            onAdd={(docType, file) => {
              if (docType === "zip") {
                setPendingDocs([{ docType, file }]);
                return;
              }
              setPendingDocs((prev) => [
                ...prev.filter((d) => d.docType !== "zip" && d.docType !== docType),
                { docType, file },
              ]);
            }}
            onRemoveExisting={(docId) => setRemovedDocIds((prev) => [...prev, docId])}
            onRemovePending={removePendingDoc}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Save"}</Button>
        </div>
      </Modal>

      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="Tender Details" size="lg">
        {viewItem && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div>
                <p className="font-mono text-sm font-bold text-blue-700">{viewItem.tenderBidNo}</p>
                <p className="text-lg font-semibold text-slate-900">{viewItem.organizationName}</p>
              </div>
              <StatusBadge status={viewItem.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Location", value: viewItem.location || "—" },
                { label: "Submitted Date", value: formatDate(viewItem.tenderSubmittedDate) },
                { label: "Quoted Product", value: viewItem.quotedProduct },
                { label: "Order Value", value: formatCurrency(viewItem.orderValue) },
                { label: "Tender Type", value: viewItem.tenderType || "—" },
                { label: "Fixed RA", value: viewItem.fixedRa || "—" },
                { label: "MII Preference", value: viewItem.miiPreference || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
                </div>
              ))}
              <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status As On Date</p>
                <p className="mt-1 whitespace-pre-wrap text-base text-slate-800">{viewItem.statusAsOnDate || "—"}</p>
              </div>
              {viewItem.documents && viewItem.documents.length > 0 && (
                <div className="col-span-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</p>
                  <div className="space-y-2">
                    {viewItem.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        {doc.docType === "zip" ? "ZIP" : doc.docType === "tender_bid" ? "Tender Bid" : "Technical Spec"} — {doc.fileName}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setViewItem(null)}>Close</Button>
              <Button onClick={() => { openEdit(viewItem); setViewItem(null); }}>
                <Pencil size={15} /> Edit
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
