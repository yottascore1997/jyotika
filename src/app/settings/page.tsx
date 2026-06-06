export default function SettingsPage() {
  return (
    <div className="card-panel max-w-lg p-6">
      <h3 className="mb-4 text-sm font-bold text-slate-800">Application Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="label-field">Company Name</label>
          <input className="input-field" defaultValue="Margitech" />
        </div>
        <div>
          <label className="label-field">Low Stock Alert Threshold (default)</label>
          <input type="number" className="input-field" defaultValue={10} />
        </div>
        <div>
          <label className="label-field">Currency</label>
          <select className="input-field" defaultValue="INR">
            <option>INR (₹)</option>
            <option>USD ($)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
