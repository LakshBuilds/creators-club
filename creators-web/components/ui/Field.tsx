import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = { label: string; hint?: string } & (
  | ({ as?: "input" } & InputHTMLAttributes<HTMLInputElement>)
  | ({ as: "textarea" } & TextareaHTMLAttributes<HTMLTextAreaElement>)
);

export function Field(props: FieldProps) {
  const { label, hint, as = "input", ...rest } = props as FieldProps & { as?: "input" | "textarea" };
  const shared =
    "w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-950 placeholder:text-indigo-400/80 focus:outline-none focus:ring-2 focus:ring-indigo-800";
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-indigo-950">{label}</span>
      {as === "textarea" ? (
        <textarea rows={4} className={shared} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input className={shared} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {hint ? <span className="mt-1 block text-xs text-indigo-700/70">{hint}</span> : null}
    </label>
  );
}
