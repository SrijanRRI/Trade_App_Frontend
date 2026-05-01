const statusMap = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  pending_review: "bg-amber-50 text-amber-700 ring-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  partially_accepted: "bg-blue-50 text-blue-700 ring-blue-200",
  moved_to_inventory: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  not_moved: "bg-slate-50 text-slate-700 ring-slate-200",
  moved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  partially_sold: "bg-blue-50 text-blue-700 ring-blue-200",
  sold: "bg-slate-100 text-slate-700 ring-slate-300",
  dummy_synced: "bg-purple-50 text-purple-700 ring-purple-200",
  synced: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  created: "bg-blue-50 text-blue-700 ring-blue-200",
  inventory_deducted: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  link_sent: "bg-blue-50 text-blue-700 ring-blue-200",
  viewed: "bg-amber-50 text-amber-700 ring-amber-200",
  expired: "bg-slate-100 text-slate-700 ring-slate-300"
};

export default function Badge({ value }) {
  const key = String(value || "unknown");
  const cls = statusMap[key] || "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {key.replaceAll("_", " ")}
    </span>
  );
}