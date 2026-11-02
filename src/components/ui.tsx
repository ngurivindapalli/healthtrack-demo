import { cn } from "@/lib/cn";

export function Button({
  children,
  className,
  variant = "primary",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "one" | "danger";
}) {
  const styles = {
    primary:
      "bg-pine text-surface hover:bg-pine-2 disabled:bg-sage disabled:text-surface",
    secondary: "bg-surface text-ink hairline hover:bg-paper-2",
    ghost: "bg-transparent text-ink-soft hover:bg-paper-2 hover:text-ink",
    one: "bg-one text-white hover:bg-one-ink",
    danger: "bg-attention text-white hover:opacity-90",
  } as const;
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hairline",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] font-medium text-muted">
      {children}
    </p>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink",
        props.className,
      )}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted",
        props.className,
      )}
    />
  );
}
