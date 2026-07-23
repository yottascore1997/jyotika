"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  ACCESSORIES_CHECKLIST,
  CATEGORIES,
  INWARD_PURPOSES,
  INWARD_STOCK_STATUSES,
  MATERIAL_TYPES,
  SET_PART_ROLES,
  WORKING_CONDITIONS,
} from "@/lib/constants";
import { toInputDate } from "@/lib/utils";

export type SetItemForm = {
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

export type CompleteSetForm = {
  materialType: string;
  category: string;
  warrantyStatus: string;
  currentStatus: string;
  currentHolder: string;
  location: string;
  purchaseCost: number;
  workingCondition: string;
  oemSupplier: string;
  make: string;
  modelNumber: string;
  purpose: string;
  remarks: string;
  receivedDate: string;
  commercialInvoiceDate: string;
  commercialInvoiceNo: string;
  awbNumber: string;
};

type Props = {
  form: CompleteSetForm;
  onChange: (patch: Partial<CompleteSetForm>) => void;
  items: SetItemForm[];
  onItemsChange: (items: SetItemForm[]) => void;
  selectedAccessories: string[];
  onToggleAccessory: (name: string) => void;
  createItem: (defaults?: Partial<CompleteSetForm>, partRole?: string) => SetItemForm;
};

function Section({
  step,
  title,
  hint,
  tone = "slate",
  children,
  right,
}: {
  step: string;
  title: string;
  hint?: string;
  tone?: "blue" | "slate" | "emerald";
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const tones = {
    blue: "border-blue-100 from-blue-50/80 to-white",
    slate: "border-slate-200 from-white to-slate-50/40",
    emerald: "border-emerald-100 from-emerald-50/70 to-white",
  };
  const stepColor = {
    blue: "text-blue-600",
    slate: "text-slate-500",
    emerald: "text-emerald-700",
  };

  return (
    <section className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ${tones[tone]}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${stepColor[tone]}`}>{step}</p>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function AddSetForm({
  form,
  onChange,
  items,
  onItemsChange,
  selectedAccessories,
  onToggleAccessory,
  createItem,
}: Props) {
  const field = (key: keyof CompleteSetForm, label: string, opts?: { type?: string }) => (
    <div>
      <label className="label-field">{label}</label>
      <input
        type={opts?.type || "text"}
        className="input-field"
        value={(form[key] as string | number) ?? ""}
        onChange={(e) =>
          onChange({
            [key]: opts?.type === "number" ? Number(e.target.value) : e.target.value,
          } as Partial<CompleteSetForm>)
        }
      />
    </div>
  );

  const statusOptions = (() => {
    const values = INWARD_STOCK_STATUSES.map((s) => s.value);
    const extra =
      form.currentStatus && !values.includes(form.currentStatus as (typeof values)[number])
        ? [{ value: form.currentStatus, description: "" }]
        : [];
    return [...extra, ...INWARD_STOCK_STATUSES];
  })();

  return (
    <div className="space-y-5">
      <Section step="Step 1" title="Set Details" hint="Fill once — applies to the whole set" tone="blue">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label-field">Received Date *</label>
            <input
              type="date"
              className="input-field"
              value={toInputDate(form.receivedDate)}
              onChange={(e) => onChange({ receivedDate: e.target.value })}
            />
          </div>
          {field("modelNumber", "Set Model *")}
          {field("make", "Make / Brand")}
          <div>
            <label className="label-field">Category *</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => onChange({ category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Purpose</label>
            <select
              className="input-field"
              value={form.purpose || INWARD_PURPOSES[0]}
              onChange={(e) => onChange({ purpose: e.target.value })}
            >
              {INWARD_PURPOSES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          {field("oemSupplier", "OEM / Supplier *")}
          <div>
            <label className="label-field">Material Type</label>
            <select
              className="input-field"
              value={form.materialType}
              onChange={(e) => onChange({ materialType: e.target.value })}
            >
              {MATERIAL_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          {field("location", "Location")}
          <div>
            <label className="label-field">Set Condition</label>
            <select
              className="input-field"
              value={form.workingCondition || WORKING_CONDITIONS[0]}
              onChange={(e) => onChange({ workingCondition: e.target.value })}
            >
              {WORKING_CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Status</label>
            <select
              className="input-field"
              value={form.currentStatus || "Available"}
              onChange={(e) => onChange({ currentStatus: e.target.value })}
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.description ? `${s.value} – ${s.description}` : s.value}
                </option>
              ))}
            </select>
          </div>
          {field("purchaseCost", "Purchase Cost - US ($)", { type: "number" })}
        </div>
      </Section>

      <Section
        step="Step 2"
        title="Invoice & Shipping"
        hint="Same for all items — no need to repeat per item"
        tone="slate"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {field("commercialInvoiceNo", "Commercial Invoice No.")}
          <div>
            <label className="label-field">Commercial Invoice Date</label>
            <input
              type="date"
              className="input-field"
              value={toInputDate(form.commercialInvoiceDate)}
              onChange={(e) => onChange({ commercialInvoiceDate: e.target.value })}
            />
          </div>
          {field("awbNumber", "AWB No.")}
        </div>
        <div className="mt-3">
          <label className="label-field">Remarks</label>
          <textarea
            className="input-field"
            rows={2}
            value={form.remarks || ""}
            onChange={(e) => onChange({ remarks: e.target.value })}
            placeholder="Optional notes for this set..."
          />
        </div>
      </Section>

      <Section
        step="Step 3"
        title="Main Units & Probes"
        hint="Add serial numbers for core equipment only"
        tone="slate"
      >
        <div className="space-y-3">
          {items.map((item, idx) => {
            const updateItem = (patch: Partial<SetItemForm>) => {
              const next = [...items];
              next[idx] = { ...next[idx], ...patch };
              onItemsChange(next);
            };

            return (
              <div key={idx} className="rounded-lg border border-slate-200 bg-white/80 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">
                    Item {idx + 1}
                    {item.serialNumber ? (
                      <span className="ml-2 font-mono text-xs font-semibold text-blue-600">
                        {item.serialNumber}
                      </span>
                    ) : null}
                    <span className="ml-2 text-xs font-normal text-slate-500">({item.partRole})</span>
                  </p>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onItemsChange(items.filter((_, i) => i !== idx))}
                      className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="label-field">Serial Number *</label>
                    <input
                      className="input-field"
                      value={item.serialNumber}
                      onChange={(e) => updateItem({ serialNumber: e.target.value })}
                      placeholder="Enter serial"
                    />
                  </div>
                  <div>
                    <label className="label-field">Part Role</label>
                    <select
                      className="input-field"
                      value={item.partRole}
                      onChange={(e) => updateItem({ partRole: e.target.value })}
                    >
                      {SET_PART_ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Model *</label>
                    <input
                      className="input-field"
                      value={item.modelNumber}
                      onChange={(e) => updateItem({ modelNumber: e.target.value })}
                      placeholder={form.modelNumber || "Model"}
                    />
                  </div>
                  <div>
                    <label className="label-field">Make / Brand</label>
                    <input
                      className="input-field"
                      value={item.make}
                      onChange={(e) => updateItem({ make: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <Button
            variant="secondary"
            onClick={() => onItemsChange([...items, createItem(form)])}
          >
            <Plus size={14} /> Add Another Unit / Probe
          </Button>
        </div>
      </Section>

      <Section
        step="Step 4"
        title="Accessories Checklist"
        hint="Tick items included — checked accessories are saved with the set"
        tone="emerald"
        right={
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            {selectedAccessories.length} selected
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACCESSORIES_CHECKLIST.map((name) => {
            const checked = selectedAccessories.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => onToggleAccessory(name)}
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
                  checked
                    ? "border-emerald-400 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    checked
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {checked && <Check size={12} strokeWidth={3} />}
                </span>
                <span
                  className={`text-sm leading-snug ${
                    checked ? "font-semibold text-slate-800" : "text-slate-600"
                  }`}
                >
                  {name}
                </span>
              </button>
            );
          })}
        </div>
        {selectedAccessories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selectedAccessories.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white"
              >
                {name}
                <button
                  type="button"
                  onClick={() => onToggleAccessory(name)}
                  className="ml-0.5 opacity-80 hover:opacity-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Section>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">{items.length} unit(s)</span>
        {" + "}
        <span className="font-semibold text-emerald-700">
          {selectedAccessories.length} accessor{selectedAccessories.length === 1 ? "y" : "ies"}
        </span>
        {" = "}
        <span className="font-bold text-blue-700">
          {items.length + selectedAccessories.length} items in set
        </span>
      </div>
    </div>
  );
}
