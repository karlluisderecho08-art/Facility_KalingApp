// The moving page background behind every glass panel -- the console twin
// of the mother app's liquidBackdrop (LiquidGlass.kt). Pure CSS: the pools'
// colours, sizes and drift live in app/globals.css (.liquid-backdrop), and
// they hold still under prefers-reduced-motion.
export function LiquidBackdrop() {
  return (
    <div className="liquid-backdrop" aria-hidden="true">
      <span className="pool pool-1" />
      <span className="pool pool-2" />
      <span className="pool pool-3" />
      <span className="pool pool-4" />
      <span className="pool pool-5" />
    </div>
  )
}
