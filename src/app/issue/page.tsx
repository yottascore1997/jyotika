"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { ISSUE_PURPOSES } from "@/lib/constants";
import { formatDate, generateId } from "@/lib/utils";

export default function IssuePage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    issueNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    serialNumber: "",
    materialDescription: "",
    issuedTo: "",
    customerName: "",
    purpose: "Demo",
    expectedReturnDate: "",
    remarks: "",
  });

  const load = () => fetch("/api/issues").then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const res = await fetch("/api/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setModal(false); load(); } else alert((await res.json()).error);
  };

  const markReturn = async (id: number) => {
    const res = await fetch(`/api/issues/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actualReturnDate: new Date().toISOString() }) });
    if (res.ok) load(); else alert((await res.json()).error);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setForm({ ...form, issueNumber: generateId("ISS") }); setModal(true); }}>
          <Plus size={16} /> Issue Material
        </Button>
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr>
              {["Issue No.", "Date", "Serial No.", "Issued To", "Purpose", "Customer", "Expected Return", "Status", "Action"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="table-row">
                <td className="table-cell font-mono text-xs text-blue-600">{String(r.issueNumber)}</td>
                <td className="table-cell">{formatDate(String(r.issueDate))}</td>
                <td className="table-cell font-semibold">{String(r.serialNumber)}</td>
                <td className="table-cell">{String(r.issuedTo)}</td>
                <td className="table-cell"><StatusBadge status={String(r.purpose)} /></td>
                <td className="table-cell">{String(r.customerName || "—")}</td>
                <td className="table-cell">{r.expectedReturnDate ? formatDate(String(r.expectedReturnDate)) : "—"}</td>
                <td className="table-cell"><StatusBadge status={String(r.status)} /></td>
                <td className="table-cell">
                  {r.status === "Issued" && (
                    <button onClick={() => markReturn(Number(r.id))} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                      <RotateCcw size={12} /> Return
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Material Issue" size="lg">
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "issueNumber", l: "Issue Number" },
            { k: "serialNumber", l: "Serial Number *" },
            { k: "materialDescription", l: "Material Description" },
            { k: "issuedTo", l: "Issued To *" },
            { k: "customerName", l: "Customer Name" },
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
            <label className="label-field">Purpose</label>
            <select className="input-field" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
              {ISSUE_PURPOSES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Expected Return Date</label>
            <input type="date" className="input-field" value={form.expectedReturnDate} onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save}>Issue</Button>
        </div>
      </Modal>
    </div>
  );
}
