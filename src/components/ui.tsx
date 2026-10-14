"use client";
import Link from "next/link";
import Image from "next/image";
import {
  createContext,
  useContext,
  useId,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type FormEvent,
  type ButtonHTMLAttributes,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import {
  X,
  ArrowRight,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { useStore } from "./providers";
import { mediaURL, label, type PageData } from "@/lib/types";
const Trace = () => (
  <svg
    className="button-trace"
    aria-hidden="true"
    preserveAspectRatio="none"
    viewBox="0 0 100 48"
  >
    <rect
      x=".6"
      y=".6"
      width="98.8"
      height="46.8"
      rx="4"
      pathLength="100"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);
export function Button({
  children,
  busy,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  variant?: string;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`button ${variant} ${className}`}
      aria-busy={busy}
    >
      <Trace />
      {busy ? <LoaderCircle size={17} className="spin" /> : null}
      <span>{children}</span>
    </button>
  );
}
export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: string;
}) {
  return (
    <Link className={`button ${variant}`} href={href}>
      <Trace />
      <span>{children}</span>
      <ArrowRight size={16} />
    </Link>
  );
}
export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const reduced = useReducedMotion();
  const offset = direction === "up" ? { y: 24, x: 0 } : { y: 0, x: direction === "left" ? -24 : 24 };
  return (
    <motion.div
      className={"reveal " + className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
export function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  return <motion.div aria-hidden="true" className="scroll-progress" style={{ scaleX: reduced ? scrollYProgress : progress }} />;
}
export function Photo({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src?: string | null;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className={`photo ${className}`}>
      <Image
        src={failed ? "/images/product-placeholder.svg" : mediaURL(src)}
        alt={alt}
        fill
        sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
        priority={priority}
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}
export function Logo({ inverse = false }: { inverse?: boolean }) {
  const store = useStore();
  return (
    <Link
      href="/"
      aria-label="Nella & Vale — Home"
      className={`logo ${inverse ? "inverse" : ""}`}
    >
      <Image
        src={
          store.settings.logo_path
            ? mediaURL(store.settings.logo_path)
            : "/images/logo.png"
        }
        alt="Nella & Vale"
        unoptimized
        width={240}
        height={84}
        priority
      />
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <Reveal>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {children ? <div className="muted measure">{children}</div> : null}
      </Reveal>
      {action}
    </header>
  );
}
export function Badge({ value }: { value: unknown }) {
  const text = label(value);
  return (
    <span
      className={`badge ${["paid", "delivered", "completed", "published", "approved"].includes(String(value)) ? "good" : ["failed", "rejected", "reversed", "canceled"].includes(String(value)) ? "bad" : ""}`}
    >
      {text || "—"}
    </span>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div
      className={`notice ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {tone === "error" ? (
        <AlertCircle size={18} />
      ) : (
        <CheckCircle2 size={18} />
      )}
      <div>{children}</div>
    </div>
  );
}
export function Errors({ error }: { error: ApiError | null }) {
  return error ? (
    <Notice tone="error">
      <p>{error.message}</p>
      {Object.keys(error.fields).length ? (
        <ul>
          {Object.entries(error.fields).map(([k, values]) => (
            <li key={k}>{values.join(" ")}</li>
          ))}
        </ul>
      ) : null}
    </Notice>
  ) : null;
}
export function Busy() {
  return (
    <div className="loading" role="status">
      <LoaderCircle size={24} className="spin" />
      <span>Loading…</span>
    </div>
  );
}
export function Empty({
  title,
  children,
  href,
  linkLabel = "Continue shopping",
}: {
  title: string;
  children?: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="empty">
      <p className="eyebrow">Nella & Vale</p>
      <h2>{title}</h2>
      <div className="muted">{children}</div>
      {href ? <LinkButton href={href}>{linkLabel}</LinkButton> : null}
    </div>
  );
}
export function ResourceState({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}) {
  return loading ? (
    <Busy />
  ) : error ? (
    <>
      <Errors error={error} />
      <Button variant="secondary" onClick={reload}>
        Try again
      </Button>
    </>
  ) : null;
}
const FieldErrors = createContext<Record<string, string[]>>({});
export function Form({
  children,
  onSubmit,
  error,
  busy,
  message,
}: {
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  error?: ApiError | null;
  busy?: boolean;
  message?: string;
}) {
  return (
    <FieldErrors.Provider value={error?.fields || {}}>
      <form onSubmit={onSubmit} className="form" aria-busy={busy}>
        <Errors error={error || null} />
        {message ? <Notice>{message}</Notice> : null}
        {children}
      </form>
    </FieldErrors.Provider>
  );
}
export function Field({
  label: caption,
  name,
  children,
  hint,
  required = false,
}: {
  label: string;
  name?: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  const errs = useContext(FieldErrors);
  const messages = name ? errs[name] : null;
  return (
    <div className="field">
      <label htmlFor={id}>
        {caption}
        {required ? <span aria-label="required"> *</span> : null}
      </label>
      <div className="field-control" id={id + "-wrapper"}>
        {children}
      </div>
      {hint ? <small className="muted">{hint}</small> : null}
      {messages ? (
        <small className="field-error" role="alert">
          {messages.join(" ")}
        </small>
      ) : null}
    </div>
  );
}
export function InputField({
  label: caption,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  const id = useId();
  const errs = useContext(FieldErrors);
  const messages = props.name ? errs[props.name] : null;
  return (
    <div className="field">
      <label htmlFor={id}>
        {caption}
        {props.required ? " *" : ""}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={!!messages}
        aria-describedby={hint || messages ? id + "-hint" : undefined}
      />
      {hint || messages ? (
        <small id={id + "-hint"} className={messages ? "field-error" : "muted"}>
          {messages ? messages.join(" ") : hint}
        </small>
      ) : null}
    </div>
  );
}
export function SelectField({
  label: caption,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  const errs = useContext(FieldErrors);
  const messages = props.name ? errs[props.name] : null;
  return (
    <div className="field">
      <label htmlFor={id}>
        {caption}
        {props.required ? " *" : ""}
      </label>
      <select {...props} id={id} aria-invalid={!!messages}>
        {children}
      </select>
      {messages ? (
        <small className="field-error">{messages.join(" ")}</small>
      ) : null}
    </div>
  );
}
export function TextAreaField({
  label: caption,
  hint,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
}) {
  const id = useId();
  const errs = useContext(FieldErrors);
  const messages = props.name ? errs[props.name] : null;
  return (
    <div className="field">
      <label htmlFor={id}>
        {caption}
        {props.required ? " *" : ""}
      </label>
      <textarea {...props} id={id} aria-invalid={!!messages} />
      {hint || messages ? (
        <small className={messages ? "field-error" : "muted"}>
          {messages ? messages.join(" ") : hint}
        </small>
      ) : null}
    </div>
  );
}
export function Check({
  children,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { children: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" {...props} />
      <span>{children}</span>
    </label>
  );
}
export function Drawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const previouslyOpen = useRef(false);
  if (typeof document !== "undefined" && open && !previouslyOpen.current) {
    opener.current = document.activeElement as HTMLElement;
  }
  previouslyOpen.current = open;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="drawer"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) {
              event.preventDefault();
              opener.current.focus();
            }
          }}
        >
          <header>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close panel">
              <X />
            </Dialog.Close>
          </header>
          <div className="drawer-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Confirm({
  title,
  children,
  onConfirm,
  busy = false,
  label: caption = "Confirm",
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  busy?: boolean;
  label?: string;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button type="button" variant="secondary" disabled={busy}>
          {caption}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="confirm">
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{children}</AlertDialog.Description>
          <div className="actions">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Keep unchanged</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button type="button" onClick={onConfirm} busy={busy}>
                Confirm
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
export function Pagination<T>({
  data,
  onPage,
}: {
  data: PageData<T>;
  onPage: (n: number) => void;
}) {
  const page = data.meta?.current_page || data.current_page || 1,
    last = data.meta?.last_page || data.last_page || 1;
  return last > 1 ? (
    <nav className="pagination" aria-label="Pagination">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </Button>
      <span>
        {page} / {last}
      </span>
      <Button
        variant="secondary"
        disabled={page >= last}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </nav>
  ) : null;
}
export function downloadURL(path: string) {
  return "/api/store/" + path;
}
