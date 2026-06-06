"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

export default function HandoverPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    customerName: "", customerCompany: "", serialNumber: "",
    handoverDate: new Date().toISOString().split("T")[0], expectedReturnDate: "", remarks: "",
  });

  const load = () => fetch("/api/handovers").then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const res = await fetch("/api/handovers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setModal(false); load(); } else alert((await res.json()).error);
  };

  const markReturn = async (id: number) => {
    await fetch(`/api/handovers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Returned", actualReturnDate: new Date().toISOString() }) });
    load();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal(true)}><Plus size={16} /> Customer Handover</Button>
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr>
              {["Customer", "Company", "Serial No.", "Handover Date", "Expected Return", "Actual Return", "Status", "Action"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="table-row">
                <td className="table-cell font-medium">{String(r.customerName)}</td>
                <td className="table-cell">{String(r.customerCompany || "—")}</td>
                <td className="table-cell font-semibold">{String(r.serialNumber)}</td>
                <td className="table-cell">{formatDate(String(r.handoverDate))}</td>
                <td className="table-cell">{r.expectedReturnDate ? formatDate(String(r.expectedReturnDate)) : "—"}</td>
                <td className="table-cell">{r.actualReturnDate ? formatDate(String(r.actualReturnDate)) : "—"}</td>
                <td className="table-cell"><StatusBadge status={String(r.status)} /></td>
                <td className="table-cell">
                  {r.status === "Active" && (
                    <button onClick={() => markReturn(Number(r.id))} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      <RotateCcw size={12} /> Return
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Customer Handover" size="lg">
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "customerName", l: "Customer Name *" }, { k: "customerCompany", l: "Company" },
            { k: "serialNumber", l: "Serial Number *" },
          ].map(({ k, l }) => (
            <div key={k}>
              <label className="label-field">{l}</label>
              <input className="input-field" value={(form as Record<string, string>)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <div>
            <label className="label-field">Handover Date</label>
            <input type="date" className="input-field" value={form.handoverDate} onChange={(e) => setForm({ ...form, handoverDate: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Expected Return</label>
            <input type="date" className="input-field" value={form.expectedReturnDate} onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save}>Save Handover</Button>
        </div>
      </Modal>
    </div>
  );
}
