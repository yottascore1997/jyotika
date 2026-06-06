"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { OEM_RETURN_STATUSES } from "@/lib/constants";
import { formatDate, generateId } from "@/lib/utils";

export default function OemReturnPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ returnId: "", oemName: "", serialNumber: "", returnDate: new Date().toISOString().split("T")[0], reason: "", status: "Pending", remarks: "" });

  const load = () => fetch("/api/oem-returns").then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const url = editId ? `/api/oem-returns/${editId}` : "/api/oem-returns";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setModal(false); load(); } else alert((await res.json()).error);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setEditId(null); setForm({ ...form, returnId: generateId("OEM") }); setModal(true); }}><Plus size={16} /> OEM Return</Button>
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead><tr>{["Return ID", "OEM", "Serial No.", "Return Date", "Reason", "Status", "Action"].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="table-row">
                <td className="table-cell font-mono text-xs text-blue-600">{String(r.returnId)}</td>
                <td className="table-cell">{String(r.oemName)}</td>
                <td className="table-cell font-semibold">{String(r.serialNumber)}</td>
                <td className="table-cell">{formatDate(String(r.returnDate))}</td>
                <td className="table-cell max-w-[200px] truncate">{String(r.reason)}</td>
                <td className="table-cell"><StatusBadge status={String(r.status)} /></td>
                <td className="table-cell">
                  <button onClick={() => { setEditId(Number(r.id)); setForm({ returnId: String(r.returnId), oemName: String(r.oemName), serialNumber: String(r.serialNumber), returnDate: String(r.returnDate).split("T")[0], reason: String(r.reason), status: String(r.status), remarks: String(r.remarks || "") }); setModal(true); }} className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="OEM Return" size="lg">
        <div className="grid grid-cols-2 gap-3">
          {[{ k: "returnId", l: "Return ID" }, { k: "oemName", l: "OEM Name *" }, { k: "serialNumber", l: "Serial Number *" }].map(({ k, l }) => (
            <div key={k}><label className="label-field">{l}</label><input className="input-field" value={(form as Record<string, string>)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
          ))}
          <div><label className="label-field">Return Date</label><input type="date" className="input-field" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} /></div>
          <div><label className="label-field">Status</label><select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{OEM_RETURN_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="col-span-2"><label className="label-field">Reason</label><textarea className="input-field" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button onClick={save}>Save</Button></div>
      </Modal>
    </div>
  );
}
