import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Traps Tab focus inside `ref` while `active`, restores focus to the
 * previously focused element on deactivate, and closes on Escape.
 * Only the dialog that actually contains focus responds to Escape, so
 * stacked modals (KYC above Invest) close one at a time.
 * Scroll-locking is owned by the modal components (modalOpenCount), not here.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  // keep the latest callback without re-running the trap effect on every render
  const escRef = useRef(onEscape)
  escRef.current = onEscape

  useEffect(() => {
    if (!active) return
    const node = ref.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusFirst = () => {
      const els = node?.querySelectorAll<HTMLElement>(FOCUSABLE)
      els?.length && els[0].focus()
    }
    const t = window.setTimeout(focusFirst, 30)

    const onKeyDown = (e: KeyboardEvent) => {
      if (!node) return
      if (e.key === 'Escape') {
        // only the dialog that owns focus closes — allows stacked modals
        if (node.contains(document.activeElement)) {
          e.stopPropagation()
          escRef.current?.()
        }
        return
      }
      if (e.key !== 'Tab') return
      const els = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (!els.length) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [active, ref])
}
