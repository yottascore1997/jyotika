"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { REPAIR_STATUSES } from "@/lib/constants";
import { formatDate, generateId } from "@/lib/utils";

export default function RepairPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    repairId: "", serialNumber: "", customerName: "", complaint: "",
    receivedDate: new Date().toISOString().split("T")[0],
    repairStartDate: "", repairCompletionDate: "", returnDate: "",
    status: "Received", remarks: "",
  });

  const load = () => fetch("/api/repairs").then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const url = editId ? `/api/repairs/${editId}` : "/api/repairs";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setModal(false); load(); } else alert((await res.json()).error);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setEditId(null); setForm({ ...form, repairId: generateId("REP"), status: "Received" }); setModal(true); }}>
          <Plus size={16} /> New Repair Case
        </Button>
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr>
              {["Repair ID", "Serial No.", "Customer", "Complaint", "Received", "Status", "Return Date", "Action"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="table-row">
                <td className="table-cell font-mono text-xs text-blue-600">{String(r.repairId)}</td>
                <td className="table-cell font-semibold">{String(r.serialNumber)}</td>
                <td className="table-cell">{String(r.customerName)}</td>
                <td className="table-cell max-w-[200px] truncate">{String(r.complaint)}</td>
                <td className="table-cell">{formatDate(String(r.receivedDate))}</td>
                <td className="table-cell"><StatusBadge status={String(r.status)} /></td>
                <td className="table-cell">{r.returnDate ? formatDate(String(r.returnDate)) : "—"}</td>
                <td className="table-cell">
                  <button onClick={() => { setEditId(Number(r.id)); setForm({ repairId: String(r.repairId), serialNumber: String(r.serialNumber), customerName: String(r.customerName), complaint: String(r.complaint), receivedDate: String(r.receivedDate).split("T")[0], repairStartDate: r.repairStartDate ? String(r.repairStartDate).split("T")[0] : "", repairCompletionDate: r.repairCompletionDate ? String(r.repairCompletionDate).split("T")[0] : "", returnDate: r.returnDate ? String(r.returnDate).split("T")[0] : "", status: String(r.status), remarks: String(r.remarks || "") }); setModal(true); }} className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? "Update Repair" : "New Repair Case"} size="lg">
        <div className="grid grid-cols-2 gap-3">
          {[{ k: "repairId", l: "Repair ID" }, { k: "serialNumber", l: "Serial Number *" }, { k: "customerName", l: "Customer *" }].map(({ k, l }) => (
            <div key={k}><label className="label-field">{l}</label><input className="input-field" value={(form as Record<string, string>)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
          ))}
          <div className="col-span-2"><label className="label-field">Complaint</label><textarea className="input-field" rows={2} value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} /></div>
          <div><label className="label-field">Status</label><select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{REPAIR_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label-field">Received Date</label><input type="date" className="input-field" value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} /></div>
          <div><label className="label-field">Repair Start</label><input type="date" className="input-field" value={form.repairStartDate} onChange={(e) => setForm({ ...form, repairStartDate: e.target.value })} /></div>
          <div><label className="label-field">Completion Date</label><input type="date" className="input-field" value={form.repairCompletionDate} onChange={(e) => setForm({ ...form, repairCompletionDate: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button onClick={save}>Save</Button></div>
      </Modal>
    </div>
  );
}
