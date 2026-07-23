"use client";

import { useEffect, useState, Fragment } from "react";
import { Plus, Pencil, Trash2, Eye, ChevronDown, ChevronRight, Layers, Activity, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import StockImageUpload, {
  MAX_STOCK_IMAGES,
  type PendingStockImage,
  type StockImageRecord,
} from "@/components/stock/StockImageUpload";
import AddSetForm from "@/components/stock/AddSetForm";
import {
  INWARD_STOCK_STATUSES,
  STOCK_HOLDERS,
  MATERIAL_TYPES,
  CATEGORIES,
  WARRANTY_STATUSES,
  INWARD_PURPOSES,
  WORKING_CONDITIONS,
  SET_PART_ROLES,
  STOCK_UNIT_TYPES,
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
  images?: StockImageRecord[];
};

type StockSet = {
  id: number;
  setId: string;
  mainSerialNumber: string | null;
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
  workingCondition: string;
  currentStatus: string;
  oemSupplier: string;
  materialType: string;
  category: string;
  location: string;
  purchaseCost: number;
  remarks: string;
};

type CompleteSetForm = typeof setSharedDefaults & {
  remarks: string;
  receivedDate: string;
  commercialInvoiceDate: string;
  commercialInvoiceNo: string;
  awbNumber: string;
};

const sharedDefaults = {
  materialType: "Equipment",
  category: CATEGORIES[0] as string,
  warrantyStatus: "Active",
  currentStatus: "Available",
  currentHolder: "Store",
  location: "Main Store",
  purchaseCost: 0,
  workingCondition: WORKING_CONDITIONS[0] as string,
  oemSupplier: "",
  make: "",
  modelNumber: "",
};

const setSharedDefaults = {
  ...sharedDefaults,
  purpose: INWARD_PURPOSES[0] as string,
};

const emptySingle: Partial<Stock> = {
  ...sharedDefaults,
  quantity: 1,
  quantityUnit: "set",
  partRole: "Main Unit",
};

const createSetItem = (defaults?: Partial<CompleteSetForm>, partRole?: string): SetItemForm => ({
  serialNumber: "",
  partRole: partRole || SET_PART_ROLES[0],
  modelNumber: defaults?.modelNumber || "",
  make: defaults?.make || "",
  receivedDate: defaults?.receivedDate || "",
  quantity: 1,
  purpose: defaults?.purpose || INWARD_PURPOSES[0],
  workingCondition: defaults?.workingCondition || WORKING_CONDITIONS[0],
  currentStatus: defaults?.currentStatus || "Available",
  oemSupplier: defaults?.oemSupplier || "",
  materialType: defaults?.materialType || "Equipment",
  category: defaults?.category || CATEGORIES[0],
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
    ...setSharedDefaults,
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
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<StockImageRecord[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingStockImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);

  const resetImageState = () => {
    setPendingImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.preview));
      return [];
    });
    setExistingImages([]);
    setRemovedImageIds([]);
  };

  const uploadStockImages = async (stockId: number) => {
    for (const imageId of removedImageIds) {
      const res = await fetch(`/api/stock/${stockId}/images?imageId=${imageId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error((await res.json()).error || "Failed to remove image");
      }
    }

    if (!pendingImages.length) return;

    const formData = new FormData();
    pendingImages.forEach((image) => formData.append("images", image.file));
    const res = await fetch(`/api/stock/${stockId}/images`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error((await res.json()).error || "Failed to upload images");
    }
  };

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
      (s.mainSerialNumber || "").toLowerCase().includes(q) ||
      s.modelNumber.toLowerCase().includes(q) ||
      (s.commercialInvoiceNo || "").toLowerCase().includes(q) ||
      (s.awbNumber || "").toLowerCase().includes(q) ||
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
    resetImageState();
    const today = new Date().toISOString().split("T")[0];
    if (mode === "single") {
      setSingleForm({ ...emptySingle, receivedDate: today });
    } else {
      const setDefaults = { ...setSharedDefaults, remarks: "", receivedDate: today, commercialInvoiceDate: "", commercialInvoiceNo: "", awbNumber: "" };
      setCompleteSetForm(setDefaults);
      setSetItemRows([createSetItem(setDefaults), createSetItem(setDefaults, SET_PART_ROLES[1])]);
      setSelectedAccessories([]);
    }
    setModal(true);
  };

  const openEdit = (i: Stock) => {
    setEditId(i.id);
    setAddMode("single");
    resetImageState();
    setSingleForm({
      ...i,
      receivedDate: toInputDate(i.receivedDate),
      commercialInvoiceDate: toInputDate(i.commercialInvoiceDate),
    });
    setExistingImages(i.images || []);
    setModal(true);
  };

  const closeModal = () => {
    resetImageState();
    setSelectedAccessories([]);
    setModal(false);
  };

  const toggleAccessory = (name: string) => {
    setSelectedAccessories((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const buildAccessoryItems = (): SetItemForm[] =>
    selectedAccessories.map((name, index) => ({
      ...createSetItem(completeSetForm, "Accessory"),
      serialNumber: `ACC-${Date.now().toString(36).toUpperCase()}-${(index + 1).toString().padStart(2, "0")}`,
      modelNumber: name,
      materialType: "Accessory",
      category: "Accessories",
      quantity: 1,
      remarks: "From accessories checklist",
    }));

  const save = async () => {
    if (addMode === "set") {
      const items = [...setItemRows, ...buildAccessoryItems()];
      const res = await fetch("/api/stock/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...completeSetForm, items }),
      });
      if (res.ok) { closeModal(); load(); }
      else alert((await res.json()).error);
      return;
    }

    const url = editId ? `/api/stock/${editId}` : "/api/stock";
    const res = await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(singleForm),
    });
    if (!res.ok) {
      alert((await res.json()).error);
      return;
    }

    try {
      const saved = await res.json();
      await uploadStockImages(saved.id);
      closeModal();
      load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save images");
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

  const inwardStatusOptions = (currentStatus?: string) => {
    const inwardValues = INWARD_STOCK_STATUSES.map((s) => s.value);
    const extra =
      currentStatus && !inwardValues.includes(currentStatus as (typeof inwardValues)[number])
        ? [{ value: currentStatus, description: "" }]
        : [];
    return [...extra, ...INWARD_STOCK_STATUSES];
  };

  const renderStatusSelect = (value: string | undefined, onChange: (status: string) => void) => (
    <select className="input-field" value={value || "Available"} onChange={(e) => onChange(e.target.value)}>
      {inwardStatusOptions(value).map((s) => (
        <option key={s.value} value={s.value}>
          {s.description ? `${s.value} – ${s.description}` : s.value}
        </option>
      ))}
    </select>
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
    if (mode === "set") {
      return (
        <AddSetForm
          form={completeSetForm}
          onChange={(patch) => setCompleteSetForm({ ...completeSetForm, ...patch })}
          items={setItemRows}
          onItemsChange={setSetItemRows}
          selectedAccessories={selectedAccessories}
          onToggleAccessory={toggleAccessory}
          createItem={createSetItem}
        />
      );
    }

    const update = (patch: Partial<Stock>) => setSingleForm({ ...singleForm, ...patch });

    return (
      <>
        <div className="mb-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-600">Step 1</p>
          <label className="mb-3 block text-sm font-bold text-slate-800">Select Unit Type *</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {STOCK_UNIT_TYPES.map((unit) => {
              const selected = (singleForm.partRole || "Main Unit") === unit.value;
              return (
                <button
                  key={unit.value}
                  type="button"
                  onClick={() =>
                    setSingleForm({
                      ...singleForm,
                      partRole: unit.value,
                      materialType: unit.value === "Accessory" ? "Accessory" : singleForm.materialType || "Equipment",
                    })
                  }
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {selected && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span>
                    <span className={`block text-sm font-bold ${selected ? "text-blue-900" : "text-slate-800"}`}>
                      {unit.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{unit.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mb-4 text-sm font-semibold text-slate-500">Inward Details</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-field">Received Date *</label>
            <input
              type="date"
              className="input-field"
              value={toInputDate(singleForm.receivedDate)}
              onChange={(e) => update({ receivedDate: e.target.value })}
            />
          </div>
          {field("modelNumber", "Model *")}
          {field("make", "Make / Brand")}
          {field("serialNumber", "Serial Number *")}
          <div>
            <label className="label-field">Quantity</label>
            <input type="number" min={1} className="input-field" value={singleForm.quantity ?? 1} onChange={(e) => setSingleForm({ ...singleForm, quantity: Number(e.target.value) })} />
          </div>
        </div>

        <p className="mb-3 mt-5 text-sm font-semibold text-slate-500">Invoice & Shipping</p>
        <div className="grid grid-cols-3 gap-3">
          {field("commercialInvoiceNo", "Commercial Invoice No.")}
          <div>
            <label className="label-field">Commercial Invoice Date</label>
            <input
              type="date"
              className="input-field"
              value={toInputDate(singleForm.commercialInvoiceDate)}
              onChange={(e) => update({ commercialInvoiceDate: e.target.value })}
            />
          </div>
          {field("awbNumber", "AWB No.")}
        </div>

        <p className="mb-3 mt-5 text-sm font-semibold text-slate-500">Condition & Stock Info</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-field">Working Condition</label>
            <select className="input-field" value={singleForm.workingCondition || WORKING_CONDITIONS[0]} onChange={(e) => setSingleForm({ ...singleForm, workingCondition: e.target.value })}>
              {WORKING_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Status</label>
            {renderStatusSelect(singleForm.currentStatus, (currentStatus) => update({ currentStatus }))}
          </div>
          {field("oemSupplier", "OEM / Supplier *")}
          <div>
            <label className="label-field">Material Type</label>
            <select
              className="input-field"
              value={singleForm.materialType}
              onChange={(e) => update({ materialType: e.target.value })}
            >
              {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Category</label>
            <select
              className="input-field"
              value={singleForm.category}
              onChange={(e) => update({ category: e.target.value })}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {field("location", "Location")}
          <div>
            <label className="label-field">Purchase Cost - US ($)</label>
            <input
              type="number"
              className="input-field"
              value={singleForm.purchaseCost}
              onChange={(e) => update({ purchaseCost: Number(e.target.value) })}
            />
          </div>
          <div className="col-span-3">
            <label className="label-field">Remarks</label>
            <textarea
              className="input-field"
              rows={2}
              value={singleForm.remarks || ""}
              onChange={(e) => update({ remarks: e.target.value })}
            />
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
      </>
    );
  };

  const totalSets = sets.length;
  const standaloneMonitors = standaloneItems.filter(i => i.partRole === "Main Unit").length;
  const standaloneProbes = standaloneItems.filter(i => i.partRole === "Probe").length;
  const setMonitors = sets.reduce((sum, s) => sum + s.items.filter(i => i.partRole === "Main Unit").length, 0);
  const setProbes = sets.reduce((sum, s) => sum + s.items.filter(i => i.partRole === "Probe").length, 0);
  const totalMonitors = setMonitors + standaloneMonitors;
  const totalProbes = setProbes + standaloneProbes;

  return (
    <div>
      {/* Stock Breakdown Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Sets Card */}
        <div className="kpi-card flex items-center justify-between border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Sets</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{totalSets}</p>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">Bundled Monitor + Probe</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <Layers size={22} />
          </div>
        </div>

        {/* Monitors (Main Units) Card */}
        <div className="kpi-card flex items-center justify-between border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Monitors (Main Units)</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{totalMonitors}</p>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {setMonitors} in Sets + {standaloneMonitors} Standalone
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
            <Eye size={22} />
          </div>
        </div>

        {/* Probes Card */}
        <div className="kpi-card flex items-center justify-between border-l-4 border-l-violet-500 hover:shadow-lg transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Probes</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{totalProbes}</p>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {setProbes} in Sets + {standaloneProbes} Standalone
            </p>
          </div>
          <div className="rounded-lg bg-violet-50 p-3 text-violet-600">
            <Activity size={22} />
          </div>
        </div>
      </div>

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
        <Button onClick={() => openAdd("set")}>
          <Layers size={16} /> Add Set
        </Button>
      </div>

      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr>
              {["Actions", "Set ID / Serial", "Model", "Type", "Items", "Purpose", "Invoice", "AWB", "Condition", "Cost ($)", "Status"].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSets.map((s) => (
              <Fragment key={`set-${s.id}`}>
                <tr className="table-row bg-blue-50">
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
                  <td className="table-cell">
                    <button onClick={() => toggleSet(s.id)} className="flex items-center gap-2 font-mono text-xs font-bold text-blue-700">
                      {expandedSets.has(s.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <Layers size={14} />
                      {s.setId}
                    </button>
                  </td>
                  <td className="table-cell font-medium">{s.modelNumber}</td>
                  <td className="table-cell text-blue-600">Set</td>
                  <td className="table-cell">{s.items.length} items</td>
                  <td className="table-cell">{s.purpose || "—"}</td>
                  <td className="table-cell font-mono text-xs">{s.commercialInvoiceNo || "—"}</td>
                  <td className="table-cell font-mono text-xs">{s.awbNumber || "—"}</td>
                  <td className="table-cell">{s.workingCondition || "—"}</td>
                  <td className="table-cell">{formatUsd(s.purchaseCost)}</td>
                  <td className="table-cell"><StatusBadge status={s.currentStatus} /></td>
                </tr>
                {expandedSets.has(s.id) && s.items.map((item) => (
                  <tr key={item.id} className="table-row bg-slate-50/80">
                    <td className="table-cell">
                      <button title="Edit Item" onClick={() => openEdit(item)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                        <Pencil size={15} />
                      </button>
                    </td>
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
                  </tr>
                ))}
              </Fragment>
            ))}
            {filteredItems.map((i) => (
              <tr key={i.id} className="table-row">
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
                <td className="table-cell font-mono text-xs text-blue-600">{i.serialNumber}</td>
                <td className="table-cell">{i.modelNumber}</td>
                <td className="table-cell">
                  {i.partRole === "Main Unit" ? "Monitor" : i.partRole === "Probe" ? "Probe" : i.partRole || "Single Item"}
                </td>
                <td className="table-cell">1</td>
                <td className="table-cell">{i.purpose || "—"}</td>
                <td className="table-cell font-mono text-xs">{i.commercialInvoiceNo || "—"}</td>
                <td className="table-cell font-mono text-xs">{i.awbNumber || "—"}</td>
                <td className="table-cell">{i.workingCondition || "—"}</td>
                <td className="table-cell">{formatUsd(i.purchaseCost)}</td>
                <td className="table-cell"><StatusBadge status={i.currentStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modal}
        onClose={closeModal}
        title={editId ? "Edit Stock" : addMode === "set" ? "Add Set" : "Add Stock"}
        size={addMode === "set" ? "2xl" : "xl"}
      >
        {renderInwardFields(addMode)}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={save}>{addMode === "set" ? "Save Set" : "Save"}</Button>
        </div>
      </Modal>

      <Modal isOpen={!!viewSet} onClose={() => setViewSet(null)} title={`Set Details — ${viewSet?.setId}`} size="xl">
        {viewSet && (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[
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
            {viewItem.images && viewItem.images.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Photos</p>
                <div className="flex flex-wrap gap-3">
                  {viewItem.images.map((image) => (
                    <a
                      key={image.id}
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block h-28 w-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <img src={image.url} alt={image.fileName} className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
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
