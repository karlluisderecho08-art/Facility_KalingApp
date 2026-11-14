'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Closes a hand-rolled dropdown when the user clicks or taps anywhere outside
 * it, or presses Escape -- what every menu is expected to do. Without this the
 * notifications panel and the account menu stayed open until their own button
 * was pressed again: they could sit open on top of each other, and stayed open
 * after moving to another page.
 *
 * `ref` wraps both the button and its panel, so pressing the button itself
 * still toggles the menu through its own onClick.
 */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, open, onDismiss])
}
