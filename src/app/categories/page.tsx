"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = () => fetch("/api/categories").then((r) => r.json()).then(setCategories);
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) {
      setModalOpen(false);
      load();
    }
  };

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => { setEditingId(null); setName(""); setDescription(""); setModalOpen(true); }}>
          <Plus size={16} /> Add Category
        </Button>
      </div>
      <div className="card-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Category Name</th>
              <th className="table-header">Description</th>
              <th className="table-header">Items</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="table-row">
                <td className="table-cell font-medium">{c.name}</td>
                <td className="table-cell text-slate-500">{c.description || "—"}</td>
                <td className="table-cell">{c._count?.items ?? 0}</td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(c.id); setName(c.name); setDescription(c.description || ""); setModalOpen(true); }} className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                      <Pencil size={15} />
                    </button>
                    <button onClick={async () => { if (confirm("Delete?")) { await fetch(`/api/categories/${c.id}`, { method: "DELETE" }); load(); } }} className="rounded p-1.5 text-rose-500 hover:bg-rose-50">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Category" : "Add Category"}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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
