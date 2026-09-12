"use client";

import { type ChangeEvent, type InputHTMLAttributes, useId, useState } from "react";

type FileUploadFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "onChange" | "type"> & {
  action: string;
  hint?: string;
  className?: string;
  fileName?: string | null;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function FileUploadField({ action, hint, className = "", fileName, onChange, disabled, ...inputProps }: FileUploadFieldProps) {
  const id = useId();
  const [selectedFileName, setSelectedFileName] = useState("");
  const displayedFileName = fileName ?? selectedFileName;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFileName(event.target.files?.[0]?.name || "");
    onChange?.(event);
  }

  return <div className={className}>
    <input {...inputProps} id={id} type="file" disabled={disabled} onChange={handleChange} className="sr-only" />
    <label htmlFor={id} className={`file-upload-field flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm shadow-sm transition-colors duration-150 hover:border-[var(--admin-accent-border,#8b5cf6)] hover:bg-[var(--admin-soft,#f5f3ff)] focus-within:ring-2 focus-within:ring-[var(--admin-primary,#6d28d9)] focus-within:ring-offset-2 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
      <span className="font-medium text-gray-800">{action}</span>
      <span className="text-xs text-gray-500">{hint || "Clique para selecionar um arquivo"}</span>
    </label>
    {displayedFileName && <p className="upload-feedback mt-2 break-all text-xs font-medium text-green-700">Arquivo selecionado: {displayedFileName}</p>}
  </div>;
}
