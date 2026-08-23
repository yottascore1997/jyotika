"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { CATEGORIES, MATERIAL_TYPES, REPAIR_STATUSES } from "@/lib/constants";
import { formatDate, generateId } from "@/lib/utils";

type StockOption = {
  id: number;
  serialNumber: string;
  modelNumber: string;
  make?: string | null;
  currentStatus: string;
  currentHolder?: string;
  oemSupplier?: string;
};

type RepairForm = {
  repairId: string;
  materialSource: "New" | "Existing";
  serialNumber: string;
  customerName: string;
  complaint: string;
  receivedDate: string;
  repairStartDate: string;
  repairCompletionDate: string;
  returnDate: string;
  status: string;
  remarks: string;
  physicalDamage: boolean;
  modelNumber: string;
  make: string;
  oemSupplier: string;
  materialType: string;
  category: string;
};

const emptyForm = (): RepairForm => ({
  repairId: "",
  materialSource: "Existing",
  serialNumber: "",
  customerName: "",
  complaint: "",
  receivedDate: new Date().toISOString().split("T")[0],
  repairStartDate: "",
  repairCompletionDate: "",
  returnDate: "",
  status: "Received",
  remarks: "",
  physicalDamage: false,
  modelNumber: "",
  make: "",
  oemSupplier: "",
  materialType: "Equipment",
  category: CATEGORIES[0] as string,
});

function detectMaterialSource(remarks: unknown): "New" | "Existing" {
  const text = String(remarks || "");
  if (text.includes("[New Material]")) return "New";
  return "Existing";
}

export default function RepairPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [stockOptions, setStockOptions] = useState<StockOption[]>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<RepairForm>(emptyForm());
  const [stockSearch, setStockSearch] = useState("");

  const load = () => fetch("/api/repairs").then((r) => r.json()).then(setRows);
  const loadStock = () =>
    fetch("/api/stock?view=all")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStockOptions(data);
      });

  useEffect(() => {
    load();
    loadStock();
  }, []);

  const filteredStock = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    if (!q) return stockOptions.slice(0, 50);
    return stockOptions
      .filter(
        (s) =>
          s.serialNumber.toLowerCase().includes(q) ||
          s.modelNumber.toLowerCase().includes(q) ||
          (s.make || "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [stockOptions, stockSearch]);

  const openCreate = () => {
    setEditId(null);
    setStockSearch("");
    setForm({ ...emptyForm(), repairId: generateId("REP") });
    setModal(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setStockSearch("");
    setForm({
      repairId: String(r.repairId),
      materialSource: detectMaterialSource(r.remarks),
      serialNumber: String(r.serialNumber),
      customerName: String(r.customerName),
      complaint: String(r.complaint),
      receivedDate: String(r.receivedDate).split("T")[0],
      repairStartDate: r.repairStartDate ? String(r.repairStartDate).split("T")[0] : "",
      repairCompletionDate: r.repairCompletionDate
        ? String(r.repairCompletionDate).split("T")[0]
        : "",
      returnDate: r.returnDate ? String(r.returnDate).split("T")[0] : "",
      status: String(r.status),
      remarks: String(r.remarks || "")
        .replace("[New Material]", "")
        .replace("[Existing Material]", "")
        .trim(),
      physicalDamage: Boolean(r.physicalDamage),
      modelNumber: "",
      make: "",
      oemSupplier: "",
      materialType: "Equipment",
      category: CATEGORIES[0] as string,
    });
    setModal(true);
  };

  const selectExistingSerial = (serial: string) => {
    const stock = stockOptions.find((s) => s.serialNumber === serial);
    setForm((prev) => ({
      ...prev,
      serialNumber: serial,
      ...(stock
        ? {
            modelNumber: stock.modelNumber,
            make: stock.make || "",
            oemSupplier: stock.oemSupplier || "",
          }
        : {}),
    }));
    setStockSearch(serial);
  };

  const save = async () => {
    if (!form.serialNumber.trim() || !form.customerName.trim() || !form.complaint.trim()) {
      alert("Serial number, customer, and complaint are required");
      return;
    }
    if (!editId && form.materialSource === "New" && !form.modelNumber.trim()) {
      alert("Model number is required for new material");
      return;
    }

    const url = editId ? `/api/repairs/${editId}` : "/api/repairs";
    const res = await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setModal(false);
      load();
      loadStock();
    } else {
      alert((await res.json()).error);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus size={16} /> New Repair Case
        </Button>
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr>
              {[
                "Repair ID",
                "Material",
                "Serial No.",
                "Customer",
                "Complaint",
                "Received",
                "Warranty",
                "Status",
                "Return Date",
                "Action",
              ].map((h) => (
                <th key={h} className="table-header">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const source = detectMaterialSource(r.remarks);
              return (
                <tr key={String(r.id)} className="table-row">
                  <td className="table-cell font-mono text-xs text-blue-600">
                    {String(r.repairId)}
                  </td>
                  <td className="table-cell">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
                        source === "New"
                          ? "bg-violet-50 text-violet-700 ring-violet-600/20"
                          : "bg-sky-50 text-sky-700 ring-sky-600/20"
                      }`}
                    >
                      {source === "New" ? "New" : "Existing"}
                    </span>
                  </td>
                  <td className="table-cell font-semibold">{String(r.serialNumber)}</td>
                  <td className="table-cell">{String(r.customerName)}</td>
                  <td className="table-cell max-w-[200px] truncate">{String(r.complaint)}</td>
                  <td className="table-cell">{formatDate(String(r.receivedDate))}</td>
                  <td className="table-cell">
                    {r.warrantyCoverage === "Under Warranty" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        Under Warranty
                      </span>
                    ) : r.warrantyCoverage === "Void - Physical Damage" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                        Void (Physical Damage)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-600/20">
                        Out of Warranty
                      </span>
                    )}
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={String(r.status)} />
                  </td>
                  <td className="table-cell">
                    {r.returnDate ? formatDate(String(r.returnDate)) : "—"}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editId ? "Update Repair" : "New Repair Case"}
        size="lg"
      >
        {!editId && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Material Type *
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    value: "Existing" as const,
                    label: "Existing Material",
                    hint: "Select serial already in Stock Master",
                  },
                  {
                    value: "New" as const,
                    label: "New Material",
                    hint: "Customer / new unit not yet in stock",
                  },
                ] as const
              ).map((opt) => {
                const selected = form.materialSource === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        materialSource: opt.value,
                        serialNumber: "",
                        modelNumber: "",
                        make: "",
                        oemSupplier: "",
                      })
                    }
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`block text-sm font-bold ${
                        selected ? "text-blue-900" : "text-slate-800"
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Repair ID</label>
            <input
              className="input-field"
              value={form.repairId}
              onChange={(e) => setForm({ ...form, repairId: e.target.value })}
            />
          </div>

          {form.materialSource === "Existing" && !editId ? (
            <div>
              <label className="label-field">Serial Number * (from stock)</label>
              <input
                className="input-field"
                list="repair-stock-serials"
                value={form.serialNumber}
                onChange={(e) => selectExistingSerial(e.target.value)}
                placeholder="Search or select serial..."
              />
              <datalist id="repair-stock-serials">
                {filteredStock.map((s) => (
                  <option key={s.id} value={s.serialNumber}>
                    {s.modelNumber} — {s.currentStatus}
                  </option>
                ))}
              </datalist>
              {form.serialNumber && (
                <p className="mt-1 text-xs text-slate-500">
                  {stockOptions.find((s) => s.serialNumber === form.serialNumber)
                    ? `Model: ${
                        stockOptions.find((s) => s.serialNumber === form.serialNumber)
                          ?.modelNumber
                      }`
                    : "Serial not found in stock — switch to New Material if this is a new unit"}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="label-field">Serial Number *</label>
              <input
                className="input-field"
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                disabled={!!editId}
              />
            </div>
          )}

          <div>
            <label className="label-field">Customer *</label>
            <input
              className="input-field"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
          </div>

          {!editId && form.materialSource === "New" && (
            <>
              <div>
                <label className="label-field">Model Number *</label>
                <input
                  className="input-field"
                  value={form.modelNumber}
                  onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Make / Brand</label>
                <input
                  className="input-field"
                  value={form.make}
                  onChange={(e) => setForm({ ...form, make: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">OEM / Supplier</label>
                <input
                  className="input-field"
                  value={form.oemSupplier}
                  onChange={(e) => setForm({ ...form, oemSupplier: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Material Type</label>
                <select
                  className="input-field"
                  value={form.materialType}
                  onChange={(e) => setForm({ ...form, materialType: e.target.value })}
                >
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Category</label>
                <select
                  className="input-field"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="col-span-2">
            <label className="label-field">Complaint *</label>
            <textarea
              className="input-field"
              rows={2}
              value={form.complaint}
              onChange={(e) => setForm({ ...form, complaint: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">Status</label>
            <select
              className="input-field"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {REPAIR_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Received Date</label>
            <input
              type="date"
              className="input-field"
              value={form.receivedDate}
              onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">Repair Start</label>
            <input
              type="date"
              className="input-field"
              value={form.repairStartDate}
              onChange={(e) => setForm({ ...form, repairStartDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">Completion Date</label>
            <input
              type="date"
              className="input-field"
              value={form.repairCompletionDate}
              onChange={(e) => setForm({ ...form, repairCompletionDate: e.target.value })}
            />
          </div>
          <div className="col-span-2 mt-2 flex items-center gap-6 border-t border-slate-100 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className="rounded text-blue-600 focus:ring-blue-500"
                checked={form.physicalDamage}
                onChange={(e) => setForm({ ...form, physicalDamage: e.target.checked })}
              />
              Physical Damage
            </label>
            {editId && (
              <div className="text-xs font-medium text-slate-500">
                Current Coverage:{" "}
                <span className="font-bold text-slate-800">
                  {String(
                    rows.find((r) => r.id === editId)?.warrantyCoverage || "Under Warranty"
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
