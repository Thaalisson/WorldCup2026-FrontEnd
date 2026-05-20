type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
};

export function StatCard({ label, value, hint, icon }: Props) {
  return (
    <div className="glass-card p-5 flex flex-col gap-1.5 hover:border-slate-700 transition-colors duration-200">
      {icon && <span className="text-2xl mb-1 select-none">{icon}</span>}
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      {hint && <p className="text-slate-500 text-xs mt-0.5">{hint}</p>}
    </div>
  );
}
