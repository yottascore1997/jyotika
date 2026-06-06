"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { InventoryItem, Category } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const empty = {
  name: "",
  sku: "",
  categoryId: 0,
  currentStock: 0,
  minStockLevel: 10,
  unitPrice: 0,
  isActive: true,
  description: "",
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([fetch("/api/inventory").then((r) => r.json()), fetch("/api/categories").then((r) => r.json())])
      .then(([inv, cats]) => {
        setItems(inv);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...empty, categoryId: categories[0]?.id || 0 });
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      sku: item.sku,
      categoryId: item.categoryId,
      currentStock: item.currentStock,
      minStockLevel: item.minStockLevel,
      unitPrice: item.unitPrice,
      isActive: item.isActive,
      description: item.description || "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    const url = editingId ? `/api/inventory/${editingId}` : "/api/inventory";
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

  const remove = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <input
          placeholder="Search items..."
          className="input-field max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={openCreate}>
          <Plus size={16} /> Add Item
        </Button>
      </div>

      <div className="card-panel overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Item Name</th>
                <th className="table-header">SKU</th>
                <th className="table-header">Category</th>
                <th className="table-header">Stock</th>
                <th className="table-header">Min Level</th>
                <th className="table-header">Price</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell font-medium">{item.name}</td>
                  <td className="table-cell text-blue-600">{item.sku}</td>
                  <td className="table-cell">{item.category?.name}</td>
                  <td className="table-cell font-semibold">{item.currentStock}</td>
                  <td className="table-cell">{item.minStockLevel}</td>
                  <td className="table-cell">{formatCurrency(item.unitPrice)}</td>
                  <td className="table-cell">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => remove(item.id)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Item" : "Add Item"} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label-field">Item Name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label-field">SKU</label>
            <input className="input-field" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Category</label>
            <select className="input-field" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Current Stock</label>
            <input type="number" className="input-field" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label-field">Min Stock Level</label>
            <input type="number" className="input-field" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label-field">Unit Price (₹)</label>
            <input type="number" className="input-field" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label-field">Active</label>
            <select className="input-field" value={form.isActive ? "yes" : "no"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "yes" })}>
              <option value="yes">Active</option>
              <option value="no">Inactive</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>{editingId ? "Update" : "Create"}</Button>
        </div>
      </Modal>
    </div>
  );
}
