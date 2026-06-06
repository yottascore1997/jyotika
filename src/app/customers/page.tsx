"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Customer } from "@/lib/types";

const empty = { name: "", email: "", phone: "", address: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);

  const load = () => fetch("/api/customers").then((r) => r.json()).then(setCustomers);
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
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
        <Button onClick={() => { setEditingId(null); setForm(empty); setModalOpen(true); }}>
          <Plus size={16} /> Add Customer
        </Button>
      </div>
      <div className="card-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Customer Name</th>
              <th className="table-header">Email</th>
              <th className="table-header">Phone</th>
              <th className="table-header">Address</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="table-row">
                <td className="table-cell font-medium">{c.name}</td>
                <td className="table-cell">{c.email || "—"}</td>
                <td className="table-cell">{c.phone || "—"}</td>
                <td className="table-cell text-slate-500">{c.address || "—"}</td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(c.id); setForm({ name: c.name, email: c.email || "", phone: c.phone || "", address: c.address || "" }); setModalOpen(true); }} className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                      <Pencil size={15} />
                    </button>
                    <button onClick={async () => { if (confirm("Delete?")) { await fetch(`/api/customers/${c.id}`, { method: "DELETE" }); load(); } }} className="rounded p-1.5 text-rose-500 hover:bg-rose-50">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Customer" : "Add Customer"} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label-field">Customer Name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Phone</label>
            <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="label-field">Address</label>
            <textarea className="input-field" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
