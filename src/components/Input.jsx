export default function Input({
  label,
  required,
  error,
  className = "",
  as = "input",
  ...props
}) {
  const Comp = as;

  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
      ) : null}

      <Comp
        className={[
          "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
          error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "",
          className
        ].join(" ")}
        {...props}
      />

      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}