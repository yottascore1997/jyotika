"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";

export default function SalesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ invoiceNumber: "", customer: "", serialNumber: "", saleDate: new Date().toISOString().split("T")[0], amount: 0 });

  const load = () => fetch("/api/sales").then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const res = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setModal(false); load(); } else alert((await res.json()).error);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setForm({ ...form, invoiceNumber: generateId("INV") }); setModal(true); }}><Plus size={16} /> Record Sale</Button>
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full">
          <thead><tr>{["Invoice No.", "Customer", "Serial No.", "Sale Date", "Amount"].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="table-row">
                <td className="table-cell font-mono text-xs text-blue-600">{String(r.invoiceNumber)}</td>
                <td className="table-cell">{String(r.customer)}</td>
                <td className="table-cell font-semibold">{String(r.serialNumber)}</td>
                <td className="table-cell">{formatDate(String(r.saleDate))}</td>
                <td className="table-cell font-bold">{formatCurrency(Number(r.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Sales Management">
        <div className="grid grid-cols-2 gap-3">
          {[{ k: "invoiceNumber", l: "Invoice Number" }, { k: "customer", l: "Customer *" }, { k: "serialNumber", l: "Serial Number *" }].map(({ k, l }) => (
            <div key={k}><label className="label-field">{l}</label><input className="input-field" value={(form as Record<string, string>)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
          ))}
          <div><label className="label-field">Sale Date</label><input type="date" className="input-field" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} /></div>
          <div><label className="label-field">Amount (₹)</label><input type="number" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
        </div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button onClick={save}>Record Sale</Button></div>
      </Modal>
    </div>
  );
}
