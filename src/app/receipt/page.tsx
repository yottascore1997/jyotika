"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { MATERIAL_TYPES, CATEGORIES, WARRANTY_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateId } from "@/lib/utils";

export default function ReceiptPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    grnNumber: "",
    receivedDate: new Date().toISOString().split("T")[0],
    supplierOem: "",
    materialDescription: "",
    modelNumber: "",
    serialNumber: "",
    quantity: 1,
    materialType: "Equipment",
    receivedBy: "Admin",
    poNumber: "",
    category: "Other",
    make: "",
    purchaseCost: 0,
    warrantyStatus: "Active",
    remarks: "",
  });

  const load = () => fetch("/api/receipts").then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const res = await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setModal(false); load(); }
    else alert((await res.json()).error);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setForm({ ...form, grnNumber: generateId("GRN"), serialNumber: "" }); setModal(true); }}>
          <Plus size={16} /> New Receipt
        </Button>
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr>
              {["GRN No.", "Date", "Supplier/OEM", "Serial No.", "Model", "Type", "Received By", "PO No.", "Status"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="table-row">
                <td className="table-cell font-mono text-xs text-blue-600">{String(r.grnNumber)}</td>
                <td className="table-cell">{formatDate(String(r.receivedDate))}</td>
                <td className="table-cell">{String(r.supplierOem)}</td>
                <td className="table-cell font-semibold">{String(r.serialNumber)}</td>
                <td className="table-cell">{String(r.modelNumber)}</td>
                <td className="table-cell">{String(r.materialType)}</td>
                <td className="table-cell">{String(r.receivedBy)}</td>
                <td className="table-cell">{String(r.poNumber || "—")}</td>
                <td className="table-cell"><StatusBadge status="Available" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Material Receipt (GRN)" size="xl">
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: "grnNumber", l: "GRN Number" },
            { k: "serialNumber", l: "Serial Number *" },
            { k: "modelNumber", l: "Model Number *" },
            { k: "supplierOem", l: "Supplier / OEM *" },
            { k: "materialDescription", l: "Material Description" },
            { k: "receivedBy", l: "Received By" },
            { k: "poNumber", l: "PO Number" },
            { k: "make", l: "Make" },
          ].map(({ k, l }) => (
            <div key={k}>
              <label className="label-field">{l}</label>
              <input className="input-field" value={(form as Record<string, string | number>)[k] as string} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <div>
            <label className="label-field">Received Date</label>
            <input type="date" className="input-field" value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} />
          </div>
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
            <label className="label-field">Purchase Cost (₹)</label>
            <input type="number" className="input-field" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: Number(e.target.value) })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save}>Receive & Create Stock</Button>
        </div>
      </Modal>
    </div>
  );
}
