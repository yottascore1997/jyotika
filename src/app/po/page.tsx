"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Truck, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { PO_ORDER_TYPES, PO_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate, toInputDate } from "@/lib/utils";

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
  quantityOrdered: number;
  unitValue: number;
  totalPoValue: number;
  advanceRequired: boolean;
  advanceReceived: boolean;
  expectedDeliveryDate: string | null;
  status: string;
  remarks: string | null;
  serialAllocations?: POAllocation[];
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
  const [modal, setModal] = useState(false);
  const [allocModal, setAllocModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activePoId, setActivePoId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [selectedStocks, setSelectedStocks] = useState<StockOption[]>([]);
  const [pickSerial, setPickSerial] = useState("");
  const [addSerial, setAddSerial] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => fetch("/api/po").then((r) => r.json()).then(setRows);
  const loadStock = () =>
    fetch("/api/stock")
      .then((r) => r.json())
      .then((items: StockOption[]) => setAvailableStock(items.filter((i) => i.currentStatus === "Available")));

  useEffect(() => {
    load();
    loadStock();
  }, []);

  const selectedSerials = useMemo(() => new Set(selectedStocks.map((s) => s.serialNumber)), [selectedStocks]);

  const stockPool = availableStock.filter((s) => !selectedSerials.has(s.serialNumber));

  const derivedItem = useMemo(() => {
    const models = Array.from(new Set(selectedStocks.map((s) => s.modelNumber)));
    return models.join(", ");
  }, [selectedStocks]);

  const derivedQty = selectedStocks.length;
  const totalValue = derivedQty * form.unitValue;

  const addStockToSelection = (serial: string) => {
    const stock = availableStock.find((s) => s.serialNumber === serial);
    if (!stock || selectedSerials.has(serial)) return;
    setSelectedStocks((prev) => [...prev, stock]);
    setPickSerial("");
  };

  const removeFromSelection = (serial: string) => {
    setSelectedStocks((prev) => prev.filter((s) => s.serialNumber !== serial));
  };

  const save = async () => {
    if (saving) return;
    if (!editId && selectedStocks.length === 0) {
      alert("Pehle Stock Master se kam se kam ek serial select karein");
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/po/${editId}` : "/api/po";
      const payload = editId
        ? { ...form, expectedDeliveryDate: form.expectedDeliveryDate || null }
        : {
            ...form,
            expectedDeliveryDate: form.expectedDeliveryDate || null,
            serialNumbers: selectedStocks.map((s) => s.serialNumber),
          };

      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setModal(false);
        setSelectedStocks([]);
        load();
        loadStock();
      } else {
        alert((await res.json()).error);
      }
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setSelectedStocks([]);
    setPickSerial("");
    setModal(true);
  };

  const openEdit = (po: POMaster) => {
    setEditId(po.id);
    setForm({
      clientName: po.clientName,
      location: po.location,
      poNumber: po.poNumber,
      poDate: toInputDate(po.poDate),
      orderType: po.orderType,
      salesPerson: po.salesPerson,
      unitValue: po.unitValue,
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
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}><Plus size={16} /> Create PO from Stock</Button>
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
                { h: "Item (Stock)", w: "w-[130px]" },
                { h: "Qty", w: "w-[50px]" },
                { h: "Total Value", w: "w-[110px]" },
                { h: "Advance", w: "w-[80px]" },
                { h: "Status", w: "w-[80px]" },
                { h: "Actions", w: "w-[100px]" },
              ].map(({ h, w }) => (
                <th key={h} className={`table-header ${w}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((po) => {
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
                    <td className="table-cell text-center">{po.quantityOrdered}</td>
                    <td className="table-cell font-semibold">{formatCurrency(po.totalPoValue)}</td>
                    <td className="table-cell text-xs">{po.advanceRequired ? (po.advanceReceived ? "Received" : "Required") : "No"}</td>
                    <td className="table-cell"><StatusBadge status={po.status} compact /></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button title="Edit" onClick={() => openEdit(po)} className="rounded-md p-2 text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button>
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
                      <td colSpan={14} className="bg-slate-50 px-6 py-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-700">
                            Stock Linked Serials — Reserved: {reserved} / Sold: {sold} / Qty: {po.quantityOrdered}
                          </p>
                          {po.status !== "Closed" && po.status !== "Cancelled" && (
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
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? "Edit PO" : "Create PO from Stock"} size="xl">
        {!editId && (
          <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
            <p className="mb-3 text-sm font-bold text-slate-800">Step 1 — Stock Master se Serial Select karein *</p>
            <div className="flex gap-2">
              <select className="input-field flex-1" value={pickSerial} onChange={(e) => setPickSerial(e.target.value)}>
                <option value="">Available stock serial...</option>
                {stockPool.map((s) => (
                  <option key={s.id} value={s.serialNumber}>
                    {s.stockId} | {s.serialNumber} | {s.modelNumber} | {s.materialType}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => addStockToSelection(pickSerial)} disabled={!pickSerial}>Add</Button>
            </div>
            {selectedStocks.length > 0 ? (
              <div className="mt-3 overflow-x-auto rounded-lg border bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr>{["Stock ID", "Serial", "Model", "Stock", "Cost", ""].map((h) => <th key={h} className="table-header">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {selectedStocks.map((s) => (
                      <tr key={s.serialNumber} className="table-row">
                        <td className="table-cell font-mono text-xs">{s.stockId}</td>
                        <td className="table-cell font-semibold">{s.serialNumber}</td>
                        <td className="table-cell">{s.modelNumber}</td>
                        <td className="table-cell">{s.materialType}</td>
                        <td className="table-cell">{formatCurrency(s.purchaseCost)}</td>
                        <td className="table-cell">
                          <button onClick={() => removeFromSelection(s.serialNumber)} className="rounded p-1 text-rose-500 hover:bg-rose-50"><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-700">Bina stock select kiye PO create nahi hoga.</p>
            )}
          </div>
        )}

        <p className="mb-3 text-sm font-bold text-slate-800">{editId ? "PO Details" : "Step 2 — PO Details"}</p>
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
            <label className="label-field">Item Description (from Stock)</label>
            <input className="input-field bg-slate-50" readOnly value={editId ? rows.find((r) => r.id === editId)?.itemDescription || "" : derivedItem} />
          </div>
          <div>
            <label className="label-field">Quantity (from Stock)</label>
            <input className="input-field bg-slate-50" readOnly value={editId ? rows.find((r) => r.id === editId)?.quantityOrdered || 0 : derivedQty} />
          </div>
          <div>
            <label className="label-field">Unit Value (₹)</label>
            <input type="number" className="input-field" value={form.unitValue} onChange={(e) => setForm({ ...form, unitValue: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label-field">Total PO Value</label>
            <input className="input-field bg-slate-50" readOnly value={formatCurrency(editId ? (rows.find((r) => r.id === editId)?.totalPoValue || 0) : totalValue)} />
          </div>
          <div>
            <label className="label-field">Expected Delivery Date</label>
            <input type="date" className="input-field" value={form.expectedDeliveryDate} onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Status</label>
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
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || (!editId && selectedStocks.length === 0)}>
            {saving ? "Saving..." : editId ? "Update PO" : "Create PO & Reserve Stock"}
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
