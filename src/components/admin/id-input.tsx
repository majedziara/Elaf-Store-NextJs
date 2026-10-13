"use client";
import { useEffect, useState } from "react";
import { InputField } from "../ui";
function parse(text: string): unknown[] {
  return text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => (/^\d+$/.test(v) ? Number(v) : v));
}
export function IdInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: unknown;
  onChange: (ids: unknown[]) => void;
}) {
  const canonical = Array.isArray(value) ? value.join(",") : "";
  const [text, setText] = useState(
    Array.isArray(value) ? value.join(", ") : "",
  );
  useEffect(() => {
    if (parse(text).join(",") !== canonical)
      setText(Array.isArray(value) ? value.join(", ") : "");
  }, [canonical]);
  return (
    <InputField
      label={label}
      hint={hint}
      value={text}
      pattern="[0-9, ]*"
      onChange={(e) => {
        setText(e.target.value);
        onChange(parse(e.target.value));
      }}
    />
  );
}
