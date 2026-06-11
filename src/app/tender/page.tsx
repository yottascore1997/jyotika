"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Trophy, XCircle, Ban, FileX } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import StockImageUpload, {
  MAX_STOCK_IMAGES,
  type PendingStockImage,
  type StockImageRecord,
} from "@/components/stock/StockImageUpload";
import { TENDER_STATUSES } from "@/lib/constants";
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
  images?: StockImageRecord[];
};

const emptyForm = (): {
  organizationName: string;
  location: string;
  tenderBidNo: string;
  tenderSubmittedDate: string;
  quotedProduct: string;
  orderValue: number;
  status: string;
  statusAsOnDate: string;
} => ({
  organizationName: "",
  location: "",
  tenderBidNo: "",
  tenderSubmittedDate: new Date().toISOString().split("T")[0],
  quotedProduct: "",
  orderValue: 0,
  status: TENDER_STATUSES[0],
  statusAsOnDate: "",
});

const STATUS_CARDS = [
  { status: "Tender Win", icon: Trophy, color: "bg-emerald-100 text-emerald-700" },
  { status: "Technically Disqualified", icon: Ban, color: "bg-orange-100 text-orange-700" },
  { status: "Commercially Disqualified", icon: XCircle, color: "bg-amber-100 text-amber-700" },
  { status: "Tender Canceled", icon: FileX, color: "bg-rose-100 text-rose-700" },
] as const;

export default function TenderPage() {
  const [rows, setRows] = useState<Tender[]>([]);
  const [modal, setModal] = useState(false);
  const [viewItem, setViewItem] = useState<Tender | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [existingImages, setExistingImages] = useState<StockImageRecord[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingStockImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);

  const resetImageState = () => {
    setPendingImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.preview));
      return [];
    });
    setExistingImages([]);
    setRemovedImageIds([]);
  };

  const uploadTenderImages = async (tenderId: number) => {
    for (const imageId of removedImageIds) {
      const res = await fetch(`/api/tenders/${tenderId}/images?imageId=${imageId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error((await res.json()).error || "Failed to remove image");
      }
    }

    if (!pendingImages.length) return;

    const formData = new FormData();
    pendingImages.forEach((image) => formData.append("images", image.file));
    const res = await fetch(`/api/tenders/${tenderId}/images`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error((await res.json()).error || "Failed to upload images");
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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TENDER_STATUSES.forEach((s) => { counts[s] = 0; });
    rows.forEach((row) => {
      if (counts[row.status] !== undefined) counts[row.status] += 1;
    });
    return counts;
  }, [rows]);

  const addPendingImages = (files: File[]) => {
    const visibleExisting = existingImages.filter((image) => !removedImageIds.includes(image.id)).length;
    const remaining = MAX_STOCK_IMAGES - visibleExisting - pendingImages.length;
    const accepted = files.slice(0, remaining);
    setPendingImages((prev) => [
      ...prev,
      ...accepted.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  const closeModal = () => {
    resetImageState();
    setModal(false);
  };

  const openCreate = () => {
    setEditId(null);
    resetImageState();
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = (row: Tender) => {
    setEditId(row.id);
    resetImageState();
    setExistingImages(row.images || []);
    setForm({
      organizationName: row.organizationName,
      location: row.location,
      tenderBidNo: row.tenderBidNo,
      tenderSubmittedDate: toInputDate(row.tenderSubmittedDate),
      quotedProduct: row.quotedProduct,
      orderValue: row.orderValue,
      status: row.status,
      statusAsOnDate: row.statusAsOnDate,
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
        await uploadTenderImages(saved.id);
        closeModal();
        load();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to save images");
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

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="kpi-card border-blue-200 bg-blue-50/50">
          <p className="text-sm font-semibold text-slate-600">Total Tenders</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{rows.length}</p>
        </div>
        {STATUS_CARDS.map(({ status, icon: Icon, color }) => (
          <div key={status} className="kpi-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold leading-snug text-slate-600">{status}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{statusCounts[status] ?? 0}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                <Icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}><Plus size={16} /> Add Tender</Button>
      </div>

      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr>
              {["#", "Organization Name", "Location", "Tender Bid No.", "Submitted Date", "Quoted Product", "Order Value", "Status", "Status As On Date", "Actions"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-cell py-10 text-center text-slate-500">
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
          <StockImageUpload
            existing={existingImages}
            pending={pendingImages}
            removedIds={removedImageIds}
            onAdd={addPendingImages}
            onRemoveExisting={(imageId) => setRemovedImageIds((prev) => [...prev, imageId])}
            onRemovePending={removePendingImage}
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
              {viewItem.images && viewItem.images.length > 0 && (
                <div className="col-span-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Photos</p>
                  <div className="flex flex-wrap gap-3">
                    {viewItem.images.map((image) => (
                      <a
                        key={image.id}
                        href={image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-24 w-24 overflow-hidden rounded-lg border border-slate-200"
                      >
                        <img src={image.url} alt={image.fileName} className="h-full w-full object-cover" />
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
