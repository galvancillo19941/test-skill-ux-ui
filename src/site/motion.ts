import { gsap } from "gsap";
import { onBeforeUnmount, onMounted, type Ref } from "vue";

/**
 * The page's animations, all GSAP (see AGENTS.md). Browser only: each
 * component animates inside a `gsap.context()` scoped to its root, created on
 * mount and reverted on unmount, so nothing keeps running after it goes.
 *
 * Elements a component reveals on mount carry `data-motion` (src/style.css
 * keeps them hidden until GSAP shows them, so the prerendered page doesn't
 * flash them first). Visitors who ask for less motion
 * (`prefers-reduced-motion`) get no animation: the CSS shows them at once.
 */

/** The visitor asked the system for less motion. */
export const reducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Runs `animate` on mount (unless motion is reduced) in a context scoped to
 * `scope`. `run` adds later animations (on a change) to that same context.
 */
export function useMotion(
  scope: Ref<HTMLElement | null>,
  animate?: (root: HTMLElement) => void,
): { run: (animation: (root: HTMLElement) => void) => void } {
  let ctx: gsap.Context | undefined;

  onMounted(() => {
    if (!scope.value || reducedMotion()) return;
    const root = scope.value;
    ctx = gsap.context(() => animate?.(root), root);
  });

  onBeforeUnmount(() => ctx?.revert());

  return {
    run: (animation) => {
      const root = scope.value;
      if (ctx && root) ctx.add(() => animation(root));
    },
  };
}

export { gsap };
