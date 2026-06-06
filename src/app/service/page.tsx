"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { ServiceRecord, Customer } from "@/lib/types";
import { formatDate, generateServiceCode } from "@/lib/utils";

const SERVICE_TYPES = ["General Service", "Repair", "Installation", "Maintenance", "Inspection"];

export default function ServicePage() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    serviceCode: "",
    customerId: 0,
    serviceType: SERVICE_TYPES[0],
    status: "Pending",
    serviceDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const load = () => {
    Promise.all([fetch("/api/service").then((r) => r.json()), fetch("/api/customers").then((r) => r.json())])
      .then(([recs, custs]) => {
        setRecords(recs);
        setCustomers(custs);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const url = editingId ? `/api/service/${editingId}` : "/api/service";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setModalOpen(false);
      load();
    }
  };

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => {
          setEditingId(null);
          setForm({
            serviceCode: generateServiceCode(),
            customerId: customers[0]?.id || 0,
            serviceType: SERVICE_TYPES[0],
            status: "Pending",
            serviceDate: new Date().toISOString().split("T")[0],
            notes: "",
          });
          setModalOpen(true);
        }}>
          <Plus size={16} /> New Service
        </Button>
      </div>
      <div className="card-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Service ID</th>
              <th className="table-header">Customer</th>
              <th className="table-header">Service Type</th>
              <th className="table-header">Status</th>
              <th className="table-header">Date</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="table-row">
                <td className="table-cell font-medium text-blue-600">{r.serviceCode}</td>
                <td className="table-cell">{r.customer?.name}</td>
                <td className="table-cell">{r.serviceType}</td>
                <td className="table-cell"><StatusBadge status={r.status} /></td>
                <td className="table-cell text-slate-500">{formatDate(r.serviceDate)}</td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    <button onClick={() => {
                      setEditingId(r.id);
                      setForm({
                        serviceCode: r.serviceCode,
                        customerId: r.customerId,
                        serviceType: r.serviceType,
                        status: r.status,
                        serviceDate: r.serviceDate.split("T")[0],
                        notes: r.notes || "",
                      });
                      setModalOpen(true);
                    }} className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                      <Pencil size={15} />
                    </button>
                    <button onClick={async () => { if (confirm("Delete?")) { await fetch(`/api/service/${r.id}`, { method: "DELETE" }); load(); } }} className="rounded p-1.5 text-rose-500 hover:bg-rose-50">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Service" : "New Service"} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Service ID</label>
            <input className="input-field" value={form.serviceCode} onChange={(e) => setForm({ ...form, serviceCode: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Customer</label>
            <select className="input-field" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })}>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Service Type</label>
            <select className="input-field" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
              {SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label-field">Service Date</label>
            <input type="date" className="input-field" value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
