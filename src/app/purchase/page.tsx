"use client";

import { Fragment, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { PurchaseOrder, Supplier, POItem } from "@/lib/types";
import { formatCurrency, formatDate, generatePONumber } from "@/lib/utils";

const emptyItem = (): POItem => ({ itemName: "", sku: "", quantity: 1, unitPrice: 0, totalPrice: 0 });

export default function PurchasePage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    poNumber: "",
    supplierId: 0,
    supplierName: "",
    status: "Draft",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDate: "",
    notes: "",
    items: [emptyItem()],
  });

  const load = () => {
    Promise.all([fetch("/api/purchase").then((r) => r.json()), fetch("/api/suppliers").then((r) => r.json())])
      .then(([ords, sups]) => {
        setOrders(ords);
        setSuppliers(sups);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const updateItem = (index: number, field: keyof POItem, value: string | number) => {
    const items = [...form.items];
    const item = { ...items[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      item.totalPrice = Number(item.quantity) * Number(item.unitPrice);
    }
    items[index] = item;
    setForm({ ...form, items });
  };

  const save = async () => {
    const url = editingId ? `/api/purchase/${editingId}` : "/api/purchase";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, expectedDate: form.expectedDate || null }),
    });
    if (res.ok) {
      setModalOpen(false);
      load();
    }
  };

  const total = form.items.reduce((s, i) => s + i.totalPrice, 0);

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => {
          setEditingId(null);
          setForm({
            poNumber: generatePONumber(),
            supplierId: suppliers[0]?.id || 0,
            supplierName: suppliers[0]?.name || "",
            status: "Draft",
            orderDate: new Date().toISOString().split("T")[0],
            expectedDate: "",
            notes: "",
            items: [emptyItem()],
          });
          setModalOpen(true);
        }}>
          <Plus size={16} /> Create PO
        </Button>
      </div>
      <div className="card-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header w-8"></th>
              <th className="table-header">PO Number</th>
              <th className="table-header">Supplier</th>
              <th className="table-header">Status</th>
              <th className="table-header">Total</th>
              <th className="table-header">Date</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((po) => (
              <Fragment key={po.id}>
                <tr className="table-row">
                  <td className="table-cell">
                    <button onClick={() => setExpandedId(expandedId === po.id ? null : po.id)} className="text-slate-400 hover:text-blue-600">
                      {expandedId === po.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </td>
                  <td className="table-cell font-medium text-blue-600">{po.poNumber}</td>
                  <td className="table-cell">{po.supplierName}</td>
                  <td className="table-cell"><StatusBadge status={po.status} /></td>
                  <td className="table-cell font-semibold">{formatCurrency(po.totalAmount)}</td>
                  <td className="table-cell text-slate-500">{formatDate(po.orderDate)}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => {
                        setEditingId(po.id);
                        setForm({
                          poNumber: po.poNumber,
                          supplierId: po.supplierId || 0,
                          supplierName: po.supplierName,
                          status: po.status,
                          orderDate: po.orderDate.split("T")[0],
                          expectedDate: po.expectedDate ? po.expectedDate.split("T")[0] : "",
                          notes: po.notes || "",
                          items: po.items.length ? po.items : [emptyItem()],
                        });
                        setModalOpen(true);
                      }} className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><Pencil size={15} /></button>
                      <button onClick={async () => { if (confirm("Delete?")) { await fetch(`/api/purchase/${po.id}`, { method: "DELETE" }); load(); } }} className="rounded p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
                {expandedId === po.id && (
                  <tr>
                    <td colSpan={7} className="bg-slate-50 px-6 py-4">
                      {po.items.map((item, i) => (
                        <div key={i} className="flex gap-4 text-sm py-1">
                          <span className="font-medium">{item.itemName}</span>
                          <span className="text-blue-600">{item.sku}</span>
                          <span>Qty: {item.quantity}</span>
                          <span>{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit PO" : "Create PO"} size="xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">PO Number</label>
            <input className="input-field" value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Supplier</label>
            <select className="input-field" value={form.supplierId} onChange={(e) => {
              const sup = suppliers.find((s) => s.id === Number(e.target.value));
              setForm({ ...form, supplierId: Number(e.target.value), supplierName: sup?.name || "" });
            }}>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Draft</option><option>Pending</option><option>Approved</option><option>Received</option><option>Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label-field">Order Date</label>
            <input type="date" className="input-field" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <p className="text-sm font-bold">Line Items</p>
            <Button size="sm" variant="secondary" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}><Plus size={14} /> Add</Button>
          </div>
          {form.items.map((item, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 rounded-lg border p-3">
              <input placeholder="Item" className="input-field" value={item.itemName} onChange={(e) => updateItem(i, "itemName", e.target.value)} />
              <input placeholder="SKU" className="input-field" value={item.sku} onChange={(e) => updateItem(i, "sku", e.target.value)} />
              <input type="number" placeholder="Qty" className="input-field" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
              <input type="number" placeholder="Price" className="input-field" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))} />
              <span className="flex items-center text-sm font-bold">{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
          <p className="text-right text-lg font-bold text-blue-600">Total: {formatCurrency(total)}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
