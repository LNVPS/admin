import { useEffect, useState } from "react";
import { confirmService, type DialogRequest } from "../services/confirmService";
import { Button } from "./Button";
import { Modal } from "./Modal";

/**
 * Renders the active confirm/prompt dialog requested via confirmService.
 * Mount once near the app root (alongside ToastContainer).
 */
export function ConfirmDialogContainer() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    return confirmService.subscribe(setRequest);
  }, []);

  // Seed the prompt input with its default value whenever a new dialog opens.
  useEffect(() => {
    if (request?.kind === "prompt") {
      setInputValue(request.options.defaultValue ?? "");
    }
  }, [request]);

  if (!request) return null;

  const handleCancel = () => {
    confirmService.resolveCurrent(request.kind === "confirm" ? false : null);
  };

  if (request.kind === "confirm") {
    const { title, message, confirmText = "Confirm", cancelText = "Cancel", variant = "danger" } = request.options;
    return (
      <Modal
        isOpen
        onClose={handleCancel}
        title={title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={handleCancel}>
              {cancelText}
            </Button>
            <Button variant={variant} onClick={() => confirmService.resolveCurrent(true)}>
              {confirmText}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300 whitespace-pre-line">{message}</p>
      </Modal>
    );
  }

  const {
    title,
    message,
    label,
    placeholder,
    confirmText = "OK",
    cancelText = "Cancel",
    required = false,
    inputType = "text",
  } = request.options;

  const canSubmit = !required || inputValue.trim().length > 0;
  const submit = () => {
    if (!canSubmit) return;
    confirmService.resolveCurrent(inputValue);
  };

  return (
    <Modal
      isOpen
      onClose={handleCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {message && <p className="text-sm text-slate-300 whitespace-pre-line">{message}</p>}
        {label && <label className="block text-xs font-medium text-white">{label}</label>}
        <input
          type={inputType}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          // biome-ignore lint/a11y/noAutofocus: focus the field when the prompt opens
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </div>
    </Modal>
  );
}
