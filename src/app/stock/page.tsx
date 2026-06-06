"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  STOCK_STATUSES,
  STOCK_HOLDERS,
  MATERIAL_TYPES,
  CATEGORIES,
  WARRANTY_STATUSES,
} from "@/lib/constants";
import { formatCurrency, formatDate, toInputDate } from "@/lib/utils";

type Stock = {
  id: number;
  stockId: string;
  materialType: string;
  oemSupplier: string;
  make?: string;
  modelNumber: string;
  serialNumber: string;
  description?: string;
  category: string;
  receivedDate: string;
  warrantyStatus: string;
  poNumber?: string;
  purchaseCost: number;
  currentStatus: string;
  currentHolder: string;
  location: string;
  remarks?: string;
};

const empty: Partial<Stock> = {
  materialType: "Equipment",
  category: "Other",
  warrantyStatus: "Active",
  currentStatus: "Available",
  currentHolder: "Store",
  location: "Main Store",
  purchaseCost: 0,
};

export default function StockPage() {
  const [items, setItems] = useState<Stock[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [viewItem, setViewItem] = useState<Stock | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Stock>>(empty);

  const load = () => fetch("/api/stock").then((r) => r.json()).then(setItems);
  useEffect(() => { load(); }, []);

  const filtered = items.filter(
    (i) =>
      i.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.stockId.toLowerCase().includes(search.toLowerCase()) ||
      i.modelNumber.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    const url = editId ? `/api/stock/${editId}` : "/api/stock";
    const res = await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setModal(false); load(); }
    else alert((await res.json()).error);
  };

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <input className="input-field max-w-sm" placeholder="Search serial, stock ID, model..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button onClick={() => { setEditId(null); setForm({ ...empty, receivedDate: new Date().toISOString().split("T")[0] }); setModal(true); }}>
          <Plus size={16} /> Add Stock
        </Button>
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr>
              {["Stock ID", "Serial No.", "Model", "OEM", "Category", "Type", "Status", "Holder", "Location", "Cost", "Actions"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="table-row">
                <td className="table-cell font-mono text-xs text-blue-600">{i.stockId}</td>
                <td className="table-cell font-semibold">{i.serialNumber}</td>
                <td className="table-cell">{i.modelNumber}</td>
                <td className="table-cell">{i.oemSupplier}</td>
                <td className="table-cell">{i.category}</td>
                <td className="table-cell">{i.materialType}</td>
                <td className="table-cell"><StatusBadge status={i.currentStatus} /></td>
                <td className="table-cell">{i.currentHolder}</td>
                <td className="table-cell">{i.location}</td>
                <td className="table-cell">{formatCurrency(i.purchaseCost)}</td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    <button
                      title="View"
                      onClick={() => setViewItem(i)}
                      className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      title="Edit"
                      onClick={() => { setEditId(i.id); setForm({ ...i, receivedDate: toInputDate(i.receivedDate) }); setModal(true); }}
                      className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      title="Delete"
                      onClick={async () => { if (confirm("Delete?")) { await fetch(`/api/stock/${i.id}`, { method: "DELETE" }); load(); } }}
                      className="rounded p-1.5 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? "Edit Stock" : "Add Stock"} size="xl">
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { k: "serialNumber" as const, l: "Serial Number *" },
              { k: "modelNumber" as const, l: "Model Number *" },
              { k: "oemSupplier" as const, l: "OEM / Supplier *" },
              { k: "make" as const, l: "Make" },
              { k: "poNumber" as const, l: "PO Number" },
              { k: "location" as const, l: "Location" },
            ] as const
          ).map(({ k, l }) => (
            <div key={k}>
              <label className="label-field">{l}</label>
              <input className="input-field" value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <div>
            <label className="label-field">Material Type</label>
            <select className="input-field" value={form.materialType} onChange={(e) => setForm({ ...form, materialType: e.target.value })}>
              {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Category</label>
            <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Warranty</label>
            <select className="input-field" value={form.warrantyStatus} onChange={(e) => setForm({ ...form, warrantyStatus: e.target.value })}>
              {WARRANTY_STATUSES.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Status</label>
            <select className="input-field" value={form.currentStatus} onChange={(e) => setForm({ ...form, currentStatus: e.target.value })}>
              {STOCK_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Holder</label>
            <select className="input-field" value={form.currentHolder} onChange={(e) => setForm({ ...form, currentHolder: e.target.value })}>
              {STOCK_HOLDERS.map((h) => <option key={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Received Date</label>
            <input type="date" className="input-field" value={toInputDate(form.receivedDate)} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Purchase Cost (₹)</label>
            <input type="number" className="input-field" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: Number(e.target.value) })} />
          </div>
          <div className="col-span-3">
            <label className="label-field">Description</label>
            <textarea className="input-field" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title="Stock Details"
        size="xl"
      >
        {viewItem && (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-bold text-blue-700">{viewItem.stockId}</span>
              <StatusBadge status={viewItem.currentStatus} />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
              {[
                { label: "Serial Number", value: viewItem.serialNumber },
                { label: "Model Number", value: viewItem.modelNumber },
                { label: "OEM / Supplier", value: viewItem.oemSupplier },
                { label: "Make", value: viewItem.make || "—" },
                { label: "Material Type", value: viewItem.materialType },
                { label: "Category", value: viewItem.category },
                { label: "Current Holder", value: viewItem.currentHolder },
                { label: "Location", value: viewItem.location },
                { label: "Warranty Status", value: viewItem.warrantyStatus },
                { label: "PO Number", value: viewItem.poNumber || "—" },
                { label: "Received Date", value: formatDate(viewItem.receivedDate) },
                { label: "Purchase Cost", value: formatCurrency(viewItem.purchaseCost) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
                </div>
              ))}
              {viewItem.description && (
                <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-1 text-base text-slate-800">{viewItem.description}</p>
                </div>
              )}
              {viewItem.remarks && (
                <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</p>
                  <p className="mt-1 text-base text-slate-800">{viewItem.remarks}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setViewItem(null)}>Close</Button>
              <Button
                onClick={() => {
                  setEditId(viewItem.id);
                  setForm({ ...viewItem, receivedDate: toInputDate(viewItem.receivedDate) });
                  setViewItem(null);
                  setModal(true);
                }}
              >
                <Pencil size={15} /> Edit
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
