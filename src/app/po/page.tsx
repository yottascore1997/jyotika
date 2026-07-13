"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Truck, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import StockImageUpload, {
  MAX_STOCK_IMAGES,
  type PendingStockImage,
  type StockImageRecord,
} from "@/components/stock/StockImageUpload";
import { PO_ORDER_TYPES, PO_STATUSES } from "@/lib/constants";
import { formatUsd, formatDate, toInputDate } from "@/lib/utils";

type POAllocation = {
  id: number;
  poMasterId: number;
  model: string;
  serialNumber: string;
  stockType: string;
  status: string;
};

type POMaster = {
  id: number;
  poId: string;
  clientName: string;
  location: string;
  poNumber: string;
  poDate: string;
  orderType: string;
  salesPerson: string;
  itemDescription: string;
  serialNumber: string | null;
  quantityOrdered: number;
  unitValue: number;
  totalPoValue: number;
  advanceRequired: boolean;
  advanceReceived: boolean;
  expectedDeliveryDate: string | null;
  status: string;
  remarks: string | null;
  serialAllocations?: POAllocation[];
  images?: StockImageRecord[];
};

type StockOption = {
  id: number;
  stockId: string;
  serialNumber: string;
  modelNumber: string;
  materialType: string;
  category: string;
  oemSupplier: string;
  location: string;
  purchaseCost: number;
  currentStatus: string;
};

const emptyForm = (): {
  clientName: string;
  location: string;
  poNumber: string;
  poDate: string;
  orderType: string;
  salesPerson: string;
  itemDescription: string;
  serialNumber: string;
  quantityOrdered: number;
  unitValue: number;
  advanceRequired: boolean;
  advanceReceived: boolean;
  expectedDeliveryDate: string;
  status: string;
  remarks: string;
} => ({
  clientName: "",
  location: "",
  poNumber: "",
  poDate: new Date().toISOString().split("T")[0],
  orderType: PO_ORDER_TYPES[0],
  salesPerson: "",
  itemDescription: "",
  serialNumber: "",
  quantityOrdered: 1,
  unitValue: 0,
  advanceRequired: false,
  advanceReceived: false,
  expectedDeliveryDate: "",
  status: PO_STATUSES[0],
  remarks: "",
});

export default function POPage() {
  const [rows, setRows] = useState<POMaster[]>([]);
  const [availableStock, setAvailableStock] = useState<StockOption[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [modal, setModal] = useState(false);
  const [allocModal, setAllocModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activePoId, setActivePoId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [addSerial, setAddSerial] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingImages, setExistingImages] = useState<StockImageRecord[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingStockImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const isCompleted = row.status === "Completed";
      return activeTab === "completed" ? isCompleted : !isCompleted;
    });
  }, [rows, activeTab]);

  const resetImageState = () => {
    setPendingImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.preview));
      return [];
    });
    setExistingImages([]);
    setRemovedImageIds([]);
  };

  const uploadPoImages = async (poId: number) => {
    for (const imageId of removedImageIds) {
      const res = await fetch(`/api/po/${poId}/images?imageId=${imageId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error((await res.json()).error || "Failed to remove image");
      }
    }

    if (!pendingImages.length) return;

    const formData = new FormData();
    pendingImages.forEach((image) => formData.append("images", image.file));
    const res = await fetch(`/api/po/${poId}/images`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error((await res.json()).error || "Failed to upload images");
    }
  };

  const load = async () => {
    const res = await fetch("/api/po");
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error("Failed to load PO records:", data?.error || data);
      setRows([]);
      return;
    }
    setRows(data);
  };
  const loadStock = async () => {
    const res = await fetch("/api/stock?view=all");
    const items = await res.json();
    if (!Array.isArray(items)) {
      setAvailableStock([]);
      return;
    }
    setAvailableStock(items.filter((i) => i.currentStatus === "Available"));
  };

  useEffect(() => {
    load();
    loadStock();
  }, []);

  const totalValue = form.quantityOrdered * form.unitValue;

  const save = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const url = editId ? `/api/po/${editId}` : "/api/po";
      const payload = {
        ...form,
        expectedDeliveryDate: form.expectedDeliveryDate || null,
      };

      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        alert((await res.json()).error);
        return;
      }

      try {
        const saved = await res.json();
        await uploadPoImages(saved.id);
        setModal(false);
        resetImageState();
        load();
        loadStock();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to save images");
      }
    } finally {
      setSaving(false);
    }
  };

  const addPendingImages = (files: File[]) => {
    const visibleExisting = existingImages.filter((image) => !removedImageIds.includes(image.id)).length;
    const remaining = MAX_STOCK_IMAGES - visibleExisting - pendingImages.length;
    const accepted = files.slice(0, remaining);
    setPendingImages((prev) => [
      ...prev,
      ...accepted.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  const closeModal = () => {
    resetImageState();
    setModal(false);
  };

  const openCreate = () => {
    setEditId(null);
    resetImageState();
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = (po: POMaster) => {
    setEditId(po.id);
    resetImageState();
    setExistingImages(po.images || []);
    setForm({
      clientName: po.clientName,
      location: po.location,
      poNumber: po.poNumber,
      poDate: toInputDate(po.poDate),
      orderType: po.orderType,
      salesPerson: po.salesPerson,
      itemDescription: po.itemDescription,
      serialNumber: po.serialNumber || "",
      quantityOrdered: po.quantityOrdered,
      unitValue: Number(po.unitValue),
      advanceRequired: po.advanceRequired,
      advanceReceived: po.advanceReceived,
      expectedDeliveryDate: toInputDate(po.expectedDeliveryDate),
      status: po.status,
      remarks: po.remarks || "",
    });
    setModal(true);
  };

  const allocateSerial = async () => {
    if (!activePoId || !addSerial) return;
    const res = await fetch(`/api/po/${activePoId}/serials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serialNumber: addSerial }),
    });
    if (res.ok) {
      setAllocModal(false);
      setAddSerial("");
      load();
      loadStock();
    } else {
      alert((await res.json()).error);
    }
  };

  const dispatchOne = async (poId: number, allocationId: number) => {
    const res = await fetch(`/api/po/${poId}/serials`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dispatch", allocationId }),
    });
    if (res.ok) { load(); loadStock(); }
    else alert((await res.json()).error);
  };

  const dispatchAll = async (poId: number) => {
    if (!confirm("Dispatch all reserved serials for this PO?")) return;
    const res = await fetch(`/api/po/${poId}/serials`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dispatchAll" }),
    });
    if (res.ok) { load(); loadStock(); }
    else alert((await res.json()).error);
  };

  const releaseAllocation = async (poId: number, allocationId: number) => {
    if (!confirm("Release this serial back to inventory?")) return;
    const res = await fetch(`/api/po/${poId}/serials?allocationId=${allocationId}`, { method: "DELETE" });
    if (res.ok) { load(); loadStock(); }
    else alert((await res.json()).error);
  };

  const openAllocModal = (poId: number) => {
    setActivePoId(poId);
    setAddSerial("");
    setAllocModal(true);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "pending"
                ? "bg-primary-50 text-primary-600 shadow-sm ring-1 ring-primary-500/10"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Pending POs
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
              activeTab === "pending"
                ? "bg-primary-100 text-primary-800"
                : "bg-slate-100 text-slate-600"
            }`}>
              {rows.filter(row => row.status !== "Completed").length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "completed"
                ? "bg-primary-50 text-primary-600 shadow-sm ring-1 ring-primary-500/10"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Completed POs
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
              activeTab === "completed"
                ? "bg-primary-100 text-primary-800"
                : "bg-slate-100 text-slate-600"
            }`}>
              {rows.filter(row => row.status === "Completed").length}
            </span>
          </button>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Create PO
        </Button>
      </div>

      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1280px]">
          <thead>
            <tr>
              <th className="table-header w-10" />
              {[
                { h: "PO ID", w: "w-[90px]" },
                { h: "Client", w: "w-[120px]" },
                { h: "Location", w: "w-[100px]" },
                { h: "PO Number", w: "w-[140px]" },
                { h: "PO Date", w: "w-[100px]" },
                { h: "Order Type", w: "w-[110px]" },
                { h: "Sales Person", w: "w-[110px]" },
                { h: "Item Description", w: "w-[130px]" },
                { h: "Serial No.", w: "w-[110px]" },
                { h: "Qty", w: "w-[50px]" },
                { h: "Total Value ($)", w: "w-[110px]" },
                { h: "Advance", w: "w-[80px]" },
                { h: "PO Status", w: "w-[100px]" },
                { h: "Actions", w: "w-[100px]" },
              ].map(({ h, w }) => (
                <th key={h} className={`table-header ${w}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-12">
                  <EmptyState
                    icon={Truck}
                    title={activeTab === "pending" ? "No pending purchase orders" : "No completed purchase orders"}
                    description={activeTab === "pending" ? "All purchase orders have been closed or cancelled." : "Completed or cancelled purchase orders will appear here."}
                  />
                </td>
              </tr>
            ) : (
              filteredRows.map((po) => {
                const allocations = po.serialAllocations || [];
                const reserved = allocations.filter((a) => a.status === "Reserved").length;
                const sold = allocations.filter((a) => a.status === "Sold").length;

                return (
                  <Fragment key={po.id}>
                    <tr className="table-row">
                      <td className="table-cell w-10">
                        <button
                          onClick={() => setExpandedId(expandedId === po.id ? null : po.id)}
                          className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        >
                          {expandedId === po.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </td>
                      <td className="table-cell font-mono text-sm font-semibold text-blue-600">{po.poId}</td>
                      <td className="table-cell font-medium">{po.clientName}</td>
                      <td className="table-cell">{po.location}</td>
                      <td className="table-cell">{po.poNumber}</td>
                      <td className="table-cell">{formatDate(po.poDate)}</td>
                      <td className="table-cell">{po.orderType}</td>
                      <td className="table-cell">{po.salesPerson}</td>
                      <td className="table-cell-wrap" title={po.itemDescription}>{po.itemDescription}</td>
                      <td className="table-cell font-mono text-sm">{po.serialNumber || "-"}</td>
                      <td className="table-cell text-center">{po.quantityOrdered}</td>
                      <td className="table-cell font-semibold">{formatUsd(po.totalPoValue)}</td>
                      <td className="table-cell text-xs">{po.advanceRequired ? (po.advanceReceived ? "Received" : "Required") : "No"}</td>
                      <td className="table-cell"><StatusBadge status={po.status} compact /></td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          {po.status !== "Completed" && (
                            <button title="Edit" onClick={() => openEdit(po)} className="rounded-md p-2 text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button>
                          )}
                          {reserved > 0 && (
                            <button title="Dispatch All" onClick={() => dispatchAll(po.id)} className="rounded-md p-2 text-violet-600 hover:bg-violet-50"><Truck size={16} /></button>
                          )}
                          <button title="Delete" onClick={async () => {
                            if (confirm("Delete this PO?")) {
                              const res = await fetch(`/api/po/${po.id}`, { method: "DELETE" });
                              if (res.ok) { load(); loadStock(); }
                              else alert((await res.json()).error);
                            }
                          }} className="rounded-md p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === po.id && (
                      <tr>
                        <td colSpan={15} className="bg-slate-50 px-6 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-700">
                              Stock Linked Serials — Reserved: {reserved} / Sold: {sold} / Qty: {po.quantityOrdered}
                            </p>
                            {po.status !== "Completed" && (
                              <Button size="sm" variant="secondary" onClick={() => openAllocModal(po.id)}>
                                <Plus size={14} /> Add Stock Serial
                              </Button>
                            )}
                          </div>
                          {allocations.length === 0 ? (
                            <p className="text-sm text-slate-500">No stock linked.</p>
                          ) : (
                            <table className="w-full rounded-lg border bg-white">
                              <thead>
                                <tr>
                                  {["PO ID", "Model", "Serial No.", "Stock", "Status", "Actions"].map((h) => (
                                    <th key={h} className="table-header">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {allocations.map((a) => (
                                  <tr key={a.id} className="table-row">
                                    <td className="table-cell font-mono text-xs">{po.poId}</td>
                                    <td className="table-cell">{a.model}</td>
                                    <td className="table-cell font-semibold">{a.serialNumber}</td>
                                    <td className="table-cell">{a.stockType}</td>
                                    <td className="table-cell"><StatusBadge status={a.status} compact /></td>
                                    <td className="table-cell">
                                      {a.status === "Reserved" && (
                                        <div className="flex gap-1">
                                          <Button size="sm" onClick={() => dispatchOne(po.id, a.id)}>Dispatch</Button>
                                          <Button size="sm" variant="secondary" onClick={() => releaseAllocation(po.id, a.id)}>Release</Button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={closeModal} title={editId ? "Edit PO" : "Create PO"} size="xl">
        <p className="mb-3 text-sm font-bold text-slate-800">PO Details</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-field">Client Name *</label>
            <input className="input-field" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Location</label>
            <input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="label-field">PO Number *</label>
            <input className="input-field" value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} placeholder="PO/Inter/25-26/50" />
          </div>
          <div>
            <label className="label-field">PO Date</label>
            <input type="date" className="input-field" value={form.poDate} onChange={(e) => setForm({ ...form, poDate: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Order Type</label>
            <select className="input-field" value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })}>
              {PO_ORDER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Sales Person</label>
            <input className="input-field" value={form.salesPerson} onChange={(e) => setForm({ ...form, salesPerson: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Item Description *</label>
            <input className="input-field" value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })} placeholder="Enter item description" />
          </div>
          <div>
            <label className="label-field">Serial Number</label>
            <input className="input-field" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Enter serial number" />
          </div>
          <div>
            <label className="label-field">Quantity Ordered *</label>
            <input type="number" className="input-field" value={form.quantityOrdered === 0 ? "" : form.quantityOrdered} onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, quantityOrdered: val === "" ? 0 : Number(val) });
            }} />
          </div>
          <div>
            <label className="label-field">Unit Value ($) *</label>
            <input type="number" className="input-field" value={form.unitValue === 0 ? "" : form.unitValue} onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, unitValue: val === "" ? 0 : Number(val) });
            }} />
          </div>
          <div>
            <label className="label-field">Total PO Value ($)</label>
            <input className="input-field bg-slate-50" readOnly value={formatUsd(totalValue)} />
          </div>
          <div>
            <label className="label-field">Expected Delivery Date</label>
            <input type="date" className="input-field" value={form.expectedDeliveryDate} onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })} />
          </div>
          <div>
            <label className="label-field">PO Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {PO_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.advanceRequired} onChange={(e) => setForm({ ...form, advanceRequired: e.target.checked })} />
              Advance Required
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.advanceReceived} onChange={(e) => setForm({ ...form, advanceReceived: e.target.checked })} />
              Advance Received
            </label>
          </div>
          <div className="col-span-3">
            <label className="label-field">Remarks</label>
            <textarea className="input-field min-h-[80px]" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
        </div>
        <div className="mt-5">
          <StockImageUpload
            existing={existingImages}
            pending={pendingImages}
            removedIds={removedImageIds}
            onAdd={addPendingImages}
            onRemoveExisting={(imageId) => setRemovedImageIds((prev) => [...prev, imageId])}
            onRemovePending={removePendingImage}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.clientName || !form.poNumber || !form.itemDescription || form.quantityOrdered <= 0}>
            {saving ? "Saving..." : editId ? "Update PO" : "Create PO"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={allocModal} onClose={() => setAllocModal(false)} title="Add Stock Serial to PO">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Stock Master se available serial select karein.</p>
          <select className="input-field" value={addSerial} onChange={(e) => setAddSerial(e.target.value)}>
            <option value="">Select serial...</option>
            {availableStock.map((s) => (
              <option key={s.id} value={s.serialNumber}>{s.stockId} | {s.serialNumber} | {s.modelNumber}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAllocModal(false)}>Cancel</Button>
          <Button onClick={allocateSerial} disabled={!addSerial}>Add to PO</Button>
        </div>
      </Modal>
    </div>
  );
}
