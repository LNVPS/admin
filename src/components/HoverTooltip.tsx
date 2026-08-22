import { useCallback, useId, useRef, useState } from "react";
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
 */
export function HoverTooltip({ content, children, className, maxWidth = 420 }: HoverTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
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

  const handleClose = useCallback(() => setPosition(null), []);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={className}
        aria-describedby={position ? tooltipId : undefined}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        onClick={(e) => e.preventDefault()}
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
            className="pointer-events-none fixed z-[100] rounded-lg border border-slate-600 bg-slate-900/98 px-3 py-2 shadow-xl shadow-black/40"
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
