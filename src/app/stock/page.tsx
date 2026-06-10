"use client";

import { useEffect, useState, Fragment } from "react";
import { Plus, Pencil, Trash2, Eye, ChevronDown, ChevronRight, Layers } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  STOCK_STATUSES,
  STOCK_HOLDERS,
  MATERIAL_TYPES,
  CATEGORIES,
  WARRANTY_STATUSES,
  INWARD_PURPOSES,
  WORKING_CONDITIONS,
  SET_PART_ROLES,
} from "@/lib/constants";
import { formatUsd, formatDate, toInputDate } from "@/lib/utils";

type Stock = {
  id: number;
  stockId: string;
  materialType: string;
  oemSupplier: string;
  make?: string;
  modelNumber: string;
  serialNumber: string;
  category: string;
  receivedDate: string;
  warrantyStatus: string;
  poNumber?: string;
  purchaseCost: number;
  currentStatus: string;
  currentHolder: string;
  location: string;
  remarks?: string;
  quantity: number;
  quantityUnit: string;
  purpose?: string;
  commercialInvoiceNo?: string;
  commercialInvoiceDate?: string;
  awbNumber?: string;
  workingCondition?: string;
  partRole?: string;
  stockSetId?: number;
};

type StockSet = {
  id: number;
  setId: string;
  mainSerialNumber: string;
  modelNumber: string;
  make?: string;
  oemSupplier: string;
  category: string;
  receivedDate: string;
  purchaseCost: number;
  currentStatus: string;
  purpose?: string;
  commercialInvoiceNo?: string;
  awbNumber?: string;
  workingCondition?: string;
  items: Stock[];
};

type SetItemForm = {
  serialNumber: string;
  partRole: string;
  modelNumber: string;
  make: string;
  receivedDate: string;
  quantity: number;
  purpose: string;
  commercialInvoiceNo: string;
  commercialInvoiceDate: string;
  awbNumber: string;
  workingCondition: string;
  currentStatus: string;
  oemSupplier: string;
  materialType: string;
  category: string;
  location: string;
  purchaseCost: number;
  remarks: string;
};

type CompleteSetForm = typeof sharedDefaults & {
  mainSerialNumber: string;
  remarks: string;
  receivedDate: string;
  commercialInvoiceDate: string;
  commercialInvoiceNo: string;
  awbNumber: string;
};

const sharedDefaults = {
  materialType: "Equipment",
  category: "Other",
  warrantyStatus: "Active",
  currentStatus: "Available",
  currentHolder: "Store",
  location: "Main Store",
  purchaseCost: 0,
  purpose: INWARD_PURPOSES[0],
  workingCondition: WORKING_CONDITIONS[0],
  oemSupplier: "",
  make: "",
  modelNumber: "",
};

const emptySingle: Partial<Stock> = {
  ...sharedDefaults,
  quantity: 1,
  quantityUnit: "set",
};

const createSetItem = (defaults?: Partial<CompleteSetForm>, partRole?: string): SetItemForm => ({
  serialNumber: "",
  partRole: partRole || SET_PART_ROLES[0],
  modelNumber: defaults?.modelNumber || "",
  make: defaults?.make || "",
  receivedDate: defaults?.receivedDate || "",
  quantity: 1,
  purpose: defaults?.purpose || INWARD_PURPOSES[0],
  commercialInvoiceNo: defaults?.commercialInvoiceNo || "",
  commercialInvoiceDate: defaults?.commercialInvoiceDate || "",
  awbNumber: defaults?.awbNumber || "",
  workingCondition: defaults?.workingCondition || WORKING_CONDITIONS[0],
  currentStatus: defaults?.currentStatus || "Available",
  oemSupplier: defaults?.oemSupplier || "",
  materialType: defaults?.materialType || "Equipment",
  category: defaults?.category || "Other",
  location: defaults?.location || "Main Store",
  purchaseCost: 0,
  remarks: "",
});

export default function StockPage() {
  const [standaloneItems, setStandaloneItems] = useState<Stock[]>([]);
  const [sets, setSets] = useState<StockSet[]>([]);
  const [expandedSets, setExpandedSets] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "set">("single");
  const [viewItem, setViewItem] = useState<Stock | null>(null);
  const [viewSet, setViewSet] = useState<StockSet | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [singleForm, setSingleForm] = useState<Partial<Stock>>(emptySingle);
  const [completeSetForm, setCompleteSetForm] = useState({
    ...sharedDefaults,
    mainSerialNumber: "",
    remarks: "",
    receivedDate: "",
    commercialInvoiceDate: "",
    commercialInvoiceNo: "",
    awbNumber: "",
  });
  const [setItemRows, setSetItemRows] = useState<SetItemForm[]>([
    createSetItem(),
    createSetItem(undefined, SET_PART_ROLES[1]),
  ]);

  const load = async () => {
    const [standalone, allSets] = await Promise.all([
      fetch("/api/stock").then((r) => r.json()),
      fetch("/api/stock/sets").then((r) => r.json()),
    ]);
    if (Array.isArray(standalone)) setStandaloneItems(standalone);
    if (Array.isArray(allSets)) setSets(allSets);
  };

  useEffect(() => { load(); }, []);

  const q = search.toLowerCase();
  const filteredItems = standaloneItems.filter(
    (i) =>
      i.serialNumber.toLowerCase().includes(q) ||
      i.stockId.toLowerCase().includes(q) ||
      i.modelNumber.toLowerCase().includes(q) ||
      (i.commercialInvoiceNo || "").toLowerCase().includes(q) ||
      (i.awbNumber || "").toLowerCase().includes(q)
  );

  const filteredSets = sets.filter(
    (s) =>
      s.setId.toLowerCase().includes(q) ||
      s.mainSerialNumber.toLowerCase().includes(q) ||
      s.modelNumber.toLowerCase().includes(q) ||
      (s.commercialInvoiceNo || "").toLowerCase().includes(q) ||
      s.items.some((i) => i.serialNumber.toLowerCase().includes(q))
  );

  const toggleSet = (id: number) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAdd = (mode: "single" | "set") => {
    setEditId(null);
    setAddMode(mode);
    const today = new Date().toISOString().split("T")[0];
    if (mode === "single") {
      setSingleForm({ ...emptySingle, receivedDate: today });
    } else {
      const setDefaults = { ...sharedDefaults, mainSerialNumber: "", remarks: "", receivedDate: today, commercialInvoiceDate: "", commercialInvoiceNo: "", awbNumber: "" };
      setCompleteSetForm(setDefaults);
      setSetItemRows([createSetItem(setDefaults), createSetItem(setDefaults, SET_PART_ROLES[1])]);
    }
    setModal(true);
  };

  const openEdit = (i: Stock) => {
    setEditId(i.id);
    setAddMode("single");
    setSingleForm({
      ...i,
      receivedDate: toInputDate(i.receivedDate),
      commercialInvoiceDate: toInputDate(i.commercialInvoiceDate),
    });
    setModal(true);
  };

  const save = async () => {
    if (addMode === "set") {
      const res = await fetch("/api/stock/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...completeSetForm, items: setItemRows }),
      });
      if (res.ok) { setModal(false); load(); }
      else alert((await res.json()).error);
      return;
    }

    const url = editId ? `/api/stock/${editId}` : "/api/stock";
    const res = await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(singleForm),
    });
    if (res.ok) { setModal(false); load(); }
    else alert((await res.json()).error);
  };

  const deleteSet = async (setId: string) => {
    if (!confirm(`Delete entire set ${setId} and all its items?`)) return;
    const res = await fetch(`/api/stock/sets/${encodeURIComponent(setId)}`, { method: "DELETE" });
    if (res.ok) load();
    else alert((await res.json()).error);
  };

  const field = (k: keyof Stock, label: string, opts?: { type?: string }) => (
    <div key={k}>
      <label className="label-field">{label}</label>
      <input
        type={opts?.type || "text"}
        className="input-field"
        value={(singleForm[k] as string | number) ?? ""}
        onChange={(e) =>
          setSingleForm({
            ...singleForm,
            [k]: opts?.type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </div>
  );

  const setField = (k: string, label: string, opts?: { type?: string }) => (
    <div key={k}>
      <label className="label-field">{label}</label>
      <input
        type={opts?.type || "text"}
        className="input-field"
        value={(completeSetForm as Record<string, string | number>)[k] ?? ""}
        onChange={(e) =>
          setCompleteSetForm({
            ...completeSetForm,
            [k]: opts?.type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </div>
  );

  const renderInwardFields = (mode: "single" | "set") => {
    const isSet = mode === "set";
    const data = isSet ? completeSetForm : singleForm;
    const update = isSet
      ? (patch: Record<string, unknown>) => setCompleteSetForm({ ...completeSetForm, ...patch })
      : (patch: Partial<Stock>) => setSingleForm({ ...singleForm, ...patch });

    return (
      <>
        <p className="mb-4 text-sm font-semibold text-slate-500">Inward Details</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-field">Received Date *</label>
            <input
              type="date"
              className="input-field"
              value={toInputDate((data as { receivedDate?: string }).receivedDate)}
              onChange={(e) => update({ receivedDate: e.target.value })}
            />
          </div>
          {isSet ? setField("modelNumber", "Set Model *") : field("modelNumber", "Model *")}
          {isSet ? setField("make", "Make / Brand") : field("make", "Make / Brand")}
          {isSet && (
            <div className="col-span-2">
              {setField("mainSerialNumber", "Set Serial Number (Main) *")}
              <p className="mt-1 text-xs text-slate-500">
                Main unit ka serial — isi se set search hoga. Must match one item below (Main Unit).
              </p>
            </div>
          )}
          {!isSet && field("serialNumber", "Serial Number *")}
          {!isSet && (
            <>
              <div>
                <label className="label-field">Quantity</label>
                <input type="number" min={1} className="input-field" value={singleForm.quantity ?? 1} onChange={(e) => setSingleForm({ ...singleForm, quantity: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label-field">Purpose</label>
                <select className="input-field" value={singleForm.purpose || INWARD_PURPOSES[0]} onChange={(e) => setSingleForm({ ...singleForm, purpose: e.target.value })}>
                  {INWARD_PURPOSES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}
          {isSet && (
            <div>
              <label className="label-field">Purpose</label>
              <select className="input-field" value={completeSetForm.purpose || INWARD_PURPOSES[0]} onChange={(e) => setCompleteSetForm({ ...completeSetForm, purpose: e.target.value })}>
                {INWARD_PURPOSES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          )}
        </div>

        {isSet && (
          <>
            <p className="mb-3 mt-5 text-sm font-semibold text-slate-500">Set Items (each with full stock details)</p>
            <div className="space-y-4">
              {setItemRows.map((item, idx) => {
                const updateItem = (patch: Partial<SetItemForm>) => {
                  const next = [...setItemRows];
                  next[idx] = { ...next[idx], ...patch };
                  setSetItemRows(next);
                };

                return (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        Item {idx + 1}
                        {item.serialNumber ? ` — ${item.serialNumber}` : ""}
                        <span className="ml-2 font-normal text-slate-500">({item.partRole})</span>
                      </p>
                      {setItemRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSetItemRows(setItemRows.filter((_, i) => i !== idx))}
                          className="rounded p-2 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label-field">Serial Number *</label>
                        <input className="input-field" value={item.serialNumber} onChange={(e) => updateItem({ serialNumber: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">Part Role</label>
                        <select className="input-field" value={item.partRole} onChange={(e) => updateItem({ partRole: e.target.value })}>
                          {SET_PART_ROLES.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-field">Received Date</label>
                        <input type="date" className="input-field" value={toInputDate(item.receivedDate || completeSetForm.receivedDate)} onChange={(e) => updateItem({ receivedDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">Model *</label>
                        <input className="input-field" value={item.modelNumber} onChange={(e) => updateItem({ modelNumber: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">Make / Brand</label>
                        <input className="input-field" value={item.make} onChange={(e) => updateItem({ make: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">Quantity</label>
                        <input type="number" min={1} className="input-field" value={item.quantity} onChange={(e) => updateItem({ quantity: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="label-field">Purpose</label>
                        <select className="input-field" value={item.purpose} onChange={(e) => updateItem({ purpose: e.target.value })}>
                          {INWARD_PURPOSES.map((p) => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-field">Commercial Invoice No.</label>
                        <input className="input-field" value={item.commercialInvoiceNo} onChange={(e) => updateItem({ commercialInvoiceNo: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">Commercial Invoice Date</label>
                        <input type="date" className="input-field" value={toInputDate(item.commercialInvoiceDate)} onChange={(e) => updateItem({ commercialInvoiceDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">AWB No.</label>
                        <input className="input-field" value={item.awbNumber} onChange={(e) => updateItem({ awbNumber: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">Working Condition</label>
                        <select className="input-field" value={item.workingCondition} onChange={(e) => updateItem({ workingCondition: e.target.value })}>
                          {WORKING_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-field">Status</label>
                        <select className="input-field" value={item.currentStatus} onChange={(e) => updateItem({ currentStatus: e.target.value })}>
                          {STOCK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-field">OEM / Supplier *</label>
                        <input className="input-field" value={item.oemSupplier} onChange={(e) => updateItem({ oemSupplier: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">Material Type</label>
                        <select className="input-field" value={item.materialType} onChange={(e) => updateItem({ materialType: e.target.value })}>
                          {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-field">Category</label>
                        <select className="input-field" value={item.category} onChange={(e) => updateItem({ category: e.target.value })}>
                          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-field">Location</label>
                        <input className="input-field" value={item.location} onChange={(e) => updateItem({ location: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">Purchase Cost ($)</label>
                        <input type="number" className="input-field" value={item.purchaseCost} onChange={(e) => updateItem({ purchaseCost: Number(e.target.value) })} />
                      </div>
                      <div className="col-span-3">
                        <label className="label-field">Remarks</label>
                        <textarea className="input-field" rows={2} value={item.remarks} onChange={(e) => updateItem({ remarks: e.target.value })} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button
                variant="secondary"
                onClick={() => setSetItemRows([...setItemRows, createSetItem(completeSetForm)])}
              >
                <Plus size={14} /> Add Item to Set
              </Button>
            </div>
          </>
        )}

        <p className="mb-3 mt-5 text-sm font-semibold text-slate-500">Invoice & Shipping</p>
        <div className="grid grid-cols-3 gap-3">
          {isSet ? setField("commercialInvoiceNo", "Commercial Invoice No.") : field("commercialInvoiceNo", "Commercial Invoice No.")}
          <div>
            <label className="label-field">Commercial Invoice Date</label>
            <input
              type="date"
              className="input-field"
              value={toInputDate(isSet ? completeSetForm.commercialInvoiceDate : singleForm.commercialInvoiceDate)}
              onChange={(e) => update({ commercialInvoiceDate: e.target.value })}
            />
          </div>
          {isSet ? setField("awbNumber", "AWB No.") : field("awbNumber", "AWB No.")}
        </div>

        <p className="mb-3 mt-5 text-sm font-semibold text-slate-500">Condition & Stock Info</p>
        <div className="grid grid-cols-3 gap-3">
          {!isSet && (
            <div>
              <label className="label-field">Working Condition</label>
              <select className="input-field" value={singleForm.workingCondition || WORKING_CONDITIONS[0]} onChange={(e) => setSingleForm({ ...singleForm, workingCondition: e.target.value })}>
                {WORKING_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
          {isSet && (
            <div>
              <label className="label-field">Set Condition</label>
              <select className="input-field" value={completeSetForm.workingCondition || WORKING_CONDITIONS[0]} onChange={(e) => setCompleteSetForm({ ...completeSetForm, workingCondition: e.target.value })}>
                {WORKING_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label-field">Status</label>
            <select
              className="input-field"
              value={isSet ? completeSetForm.currentStatus : singleForm.currentStatus}
              onChange={(e) => update({ currentStatus: e.target.value })}
            >
              {STOCK_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {isSet ? setField("oemSupplier", "OEM / Supplier *") : field("oemSupplier", "OEM / Supplier *")}
          <div>
            <label className="label-field">Material Type</label>
            <select
              className="input-field"
              value={isSet ? completeSetForm.materialType : singleForm.materialType}
              onChange={(e) => update({ materialType: e.target.value })}
            >
              {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Category</label>
            <select
              className="input-field"
              value={isSet ? completeSetForm.category : singleForm.category}
              onChange={(e) => update({ category: e.target.value })}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {isSet ? setField("location", "Location") : field("location", "Location")}
          <div>
            <label className="label-field">Purchase Cost ($)</label>
            <input
              type="number"
              className="input-field"
              value={isSet ? completeSetForm.purchaseCost : singleForm.purchaseCost}
              onChange={(e) => update({ purchaseCost: Number(e.target.value) })}
            />
          </div>
          <div className="col-span-3">
            <label className="label-field">Remarks</label>
            <textarea
              className="input-field"
              rows={2}
              value={isSet ? completeSetForm.remarks || "" : singleForm.remarks || ""}
              onChange={(e) => update({ remarks: e.target.value })}
            />
          </div>
        </div>
      </>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input-field max-w-sm"
          placeholder="Search serial, set ID, model, invoice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={() => openAdd("single")}>
          <Plus size={16} /> Add Stock
        </Button>
        <Button variant="secondary" onClick={() => openAdd("set")}>
          <Layers size={16} /> Add Complete Set
        </Button>
      </div>

      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr>
              {["Set Serial (Main)", "Set ID", "Model", "Type", "Items", "Purpose", "Invoice", "AWB", "Condition", "Cost ($)", "Status", "Actions"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSets.map((s) => (
              <Fragment key={`set-${s.id}`}>
                <tr className="table-row bg-indigo-50/40">
                  <td className="table-cell font-mono text-sm font-bold text-indigo-800">
                    {s.mainSerialNumber}
                  </td>
                  <td className="table-cell">
                    <button onClick={() => toggleSet(s.id)} className="flex items-center gap-2 font-mono text-xs font-bold text-indigo-700">
                      {expandedSets.has(s.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <Layers size={14} />
                      {s.setId}
                    </button>
                  </td>
                  <td className="table-cell font-medium">{s.modelNumber}</td>
                  <td className="table-cell text-indigo-600">Complete Set</td>
                  <td className="table-cell">{s.items.length} items</td>
                  <td className="table-cell">{s.purpose || "—"}</td>
                  <td className="table-cell font-mono text-xs">{s.commercialInvoiceNo || "—"}</td>
                  <td className="table-cell font-mono text-xs">{s.awbNumber || "—"}</td>
                  <td className="table-cell">{s.workingCondition || "—"}</td>
                  <td className="table-cell">{formatUsd(s.purchaseCost)}</td>
                  <td className="table-cell"><StatusBadge status={s.currentStatus} /></td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button title="View Set" onClick={() => setViewSet(s)} className="rounded p-1.5 text-slate-600 hover:bg-slate-100">
                        <Eye size={15} />
                      </button>
                      <button title="Delete Set" onClick={() => deleteSet(s.setId)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedSets.has(s.id) && s.items.map((item) => (
                  <tr key={item.id} className="table-row bg-slate-50/80">
                    <td className="table-cell pl-10">
                      <span className="font-semibold text-slate-800">{item.serialNumber}</span>
                      <span className="ml-2 text-xs text-slate-400">({item.partRole})</span>
                    </td>
                    <td className="table-cell text-sm text-slate-500">{item.modelNumber}</td>
                    <td className="table-cell text-sm">Set Item</td>
                    <td className="table-cell">1 pcs</td>
                    <td className="table-cell">{item.purpose || "—"}</td>
                    <td className="table-cell font-mono text-xs">{item.commercialInvoiceNo || "—"}</td>
                    <td className="table-cell font-mono text-xs">{item.awbNumber || "—"}</td>
                    <td className="table-cell">{item.workingCondition || "—"}</td>
                    <td className="table-cell">—</td>
                    <td className="table-cell"><StatusBadge status={item.currentStatus} compact /></td>
                    <td className="table-cell">
                      <button title="Edit Item" onClick={() => openEdit(item)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {filteredItems.map((i) => (
              <tr key={i.id} className="table-row">
                <td className="table-cell font-mono text-xs text-blue-600">{i.serialNumber}</td>
                <td className="table-cell font-mono text-xs text-slate-400">—</td>
                <td className="table-cell">{i.modelNumber}</td>
                <td className="table-cell">Single Item</td>
                <td className="table-cell">1</td>
                <td className="table-cell">{i.purpose || "—"}</td>
                <td className="table-cell font-mono text-xs">{i.commercialInvoiceNo || "—"}</td>
                <td className="table-cell font-mono text-xs">{i.awbNumber || "—"}</td>
                <td className="table-cell">{i.workingCondition || "—"}</td>
                <td className="table-cell">{formatUsd(i.purchaseCost)}</td>
                <td className="table-cell"><StatusBadge status={i.currentStatus} /></td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    <button title="View" onClick={() => setViewItem(i)} className="rounded p-1.5 text-slate-600 hover:bg-slate-100">
                      <Eye size={15} />
                    </button>
                    <button title="Edit" onClick={() => openEdit(i)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                      <Pencil size={15} />
                    </button>
                    <button
                      title="Delete"
                      onClick={async () => { if (confirm("Delete?")) { await fetch(`/api/stock/${i.id}`, { method: "DELETE" }); load(); } }}
                      className="rounded p-1.5 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editId ? "Edit Stock" : addMode === "set" ? "Add Complete Set" : "Add Stock"}
        size="xl"
      >
        {renderInwardFields(addMode)}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save}>{addMode === "set" ? "Save Set" : "Save"}</Button>
        </div>
      </Modal>

      <Modal isOpen={!!viewSet} onClose={() => setViewSet(null)} title={`Set Details — ${viewSet?.setId}`} size="xl">
        {viewSet && (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[
                { label: "Set Serial (Main)", value: viewSet.mainSerialNumber },
                { label: "Set ID", value: viewSet.setId },
                { label: "Model", value: viewSet.modelNumber },
                { label: "Items", value: `${viewSet.items.length} parts` },
                { label: "Invoice", value: viewSet.commercialInvoiceNo || "—" },
                { label: "AWB", value: viewSet.awbNumber || "—" },
                { label: "Cost", value: formatUsd(viewSet.purchaseCost) },
                { label: "Status", value: viewSet.currentStatus },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  {["Serial Number", "Part Role", "Condition", "Status"].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewSet.items.map((item) => (
                  <tr key={item.id} className="table-row">
                    <td className="table-cell font-semibold">{item.serialNumber}</td>
                    <td className="table-cell">{item.partRole}</td>
                    <td className="table-cell">{item.workingCondition || "—"}</td>
                    <td className="table-cell"><StatusBadge status={item.currentStatus} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Modal>

      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="Stock Details" size="xl">
        {viewItem && (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-bold text-blue-700">{viewItem.stockId}</span>
              <StatusBadge status={viewItem.currentStatus} />
              {viewItem.partRole && <span className="text-sm text-slate-500">Part: {viewItem.partRole}</span>}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
              {[
                { label: "Serial Number", value: viewItem.serialNumber },
                { label: "Model", value: viewItem.modelNumber },
                { label: "Purpose", value: viewItem.purpose || "—" },
                { label: "Commercial Invoice No.", value: viewItem.commercialInvoiceNo || "—" },
                { label: "AWB No.", value: viewItem.awbNumber || "—" },
                { label: "Working Condition", value: viewItem.workingCondition || "—" },
                { label: "Purchase Cost", value: formatUsd(viewItem.purchaseCost) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setViewItem(null)}>Close</Button>
              <Button onClick={() => { openEdit(viewItem); setViewItem(null); }}>
                <Pencil size={15} /> Edit
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
