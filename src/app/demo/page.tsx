"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, generateId } from "@/lib/utils";

export default function DemoPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    demoId: "", serialNumber: "", model: "", salesPerson: "", customer: "",
    issueDate: new Date().toISOString().split("T")[0], expectedReturnDate: "", remarks: "",
  });

  const load = () => fetch("/api/demos").then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const res = await fetch("/api/demos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setModal(false); load(); } else alert((await res.json()).error);
  };

  const markReturn = async (id: number) => {
    await fetch(`/api/demos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Returned", actualReturnDate: new Date().toISOString() }) });
    load();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setForm({ ...form, demoId: generateId("DMO") }); setModal(true); }}>
          <Plus size={16} /> New Demo
        </Button>
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr>
              {["Demo ID", "Serial No.", "Model", "Sales Person", "Customer", "Issue Date", "Expected Return", "Days Out", "Status", "Action"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className={`table-row ${r.status === "Overdue" ? "bg-rose-50/50" : ""}`}>
                <td className="table-cell font-mono text-xs text-blue-600">{String(r.demoId)}</td>
                <td className="table-cell font-semibold">{String(r.serialNumber)}</td>
                <td className="table-cell">{String(r.model)}</td>
                <td className="table-cell">{String(r.salesPerson)}</td>
                <td className="table-cell">{String(r.customer || "—")}</td>
                <td className="table-cell">{formatDate(String(r.issueDate))}</td>
                <td className="table-cell">{r.expectedReturnDate ? formatDate(String(r.expectedReturnDate)) : "—"}</td>
                <td className="table-cell font-bold">{String(r.daysOut ?? 0)}</td>
                <td className="table-cell"><StatusBadge status={String(r.status)} /></td>
                <td className="table-cell">
                  {(r.status === "Active" || r.status === "Overdue") && (
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
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Demo Tracking" size="lg">
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "demoId", l: "Demo ID" }, { k: "serialNumber", l: "Serial Number *" },
            { k: "model", l: "Model *" }, { k: "salesPerson", l: "Sales Person *" },
            { k: "customer", l: "Customer" },
          ].map(({ k, l }) => (
            <div key={k}>
              <label className="label-field">{l}</label>
              <input className="input-field" value={(form as Record<string, string>)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <div>
            <label className="label-field">Issue Date</label>
            <input type="date" className="input-field" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Expected Return</label>
            <input type="date" className="input-field" value={form.expectedReturnDate} onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save}>Create Demo</Button>
        </div>
      </Modal>
    </div>
  );
}
