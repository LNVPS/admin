import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface HoverTooltipProps {
  /** Tooltip body. Rendered into a portal so table overflow can't clip it. */
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Max width of the tooltip panel. */
  maxWidth?: number;
}

interface Position {
  top: number;
  left: number;
}

const MARGIN = 8;

/**
 * Hover/focus tooltip rendered in a portal with fixed positioning.
 *
 * Tables in this app live inside `overflow-x-auto` containers, so an absolutely
 * positioned tooltip would be clipped. Positioning is measured from the trigger
 * on open and flipped above the trigger when there isn't room below.
 *
 * Hovering previews the content; clicking the trigger *pins* the panel open so
 * its text can be selected and copied. A pinned panel stays until the trigger is
 * clicked again, Escape is pressed, or a click lands outside it.
 */
export function HoverTooltip({ content, children, className, maxWidth = 420 }: HoverTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [pinned, setPinned] = useState(false);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const panelWidth = panelRef.current?.offsetWidth ?? maxWidth;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = panelHeight > 0 && spaceBelow < panelHeight + MARGIN && rect.top > spaceBelow;

    const top = openAbove ? rect.top - panelHeight - MARGIN : rect.bottom + MARGIN;
    const left = Math.min(Math.max(MARGIN, rect.left), Math.max(MARGIN, window.innerWidth - panelWidth - MARGIN));

    setPosition({ top, left });
  }, [maxWidth]);

  const handleOpen = useCallback(() => {
    updatePosition();
    // Re-measure once the panel has real dimensions so the flip is accurate.
    requestAnimationFrame(updatePosition);
  }, [updatePosition]);

  const handleClose = useCallback(() => {
    if (pinned) return;
    setPosition(null);
  }, [pinned]);

  const togglePin = useCallback(() => {
    setPinned((wasPinned) => {
      if (wasPinned) {
        setPosition(null);
        return false;
      }
      handleOpen();
      return true;
    });
  }, [handleOpen]);

  // While pinned, dismiss on Escape or an outside click, and keep the panel
  // glued to the trigger if the page scrolls or resizes underneath it.
  useEffect(() => {
    if (!pinned) return;

    const unpin = () => {
      setPinned(false);
      setPosition(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") unpin();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      unpin();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [pinned, updatePosition]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={className}
        aria-describedby={position ? tooltipId : undefined}
        aria-expanded={pinned}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        onClick={togglePin}
      >
        {children}
      </button>
      {position &&
        createPortal(
          <div
            ref={panelRef}
            id={tooltipId}
            role="tooltip"
            style={{ top: position.top, left: position.left, maxWidth }}
            className={`fixed z-[100] rounded-lg border bg-slate-900/98 px-3 py-2 shadow-xl shadow-black/40 ${
              pinned
                ? "pointer-events-auto max-h-[70vh] select-text overflow-auto border-blue-500"
                : "pointer-events-none border-slate-600"
            }`}
          >
            {content}
            {!pinned && (
              <div className="mt-2 border-t border-slate-700 pt-1 text-[10px] text-slate-500">Click to pin & copy</div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
