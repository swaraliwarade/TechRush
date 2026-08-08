import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { DEFAULT_CURRENCY, formatCompact, formatMoney } from '@/lib/money'
import type { BalancePoint } from '@/lib/transactions'

/** Tracks the rendered width so the SVG can be drawn in real pixels — a
 *  stretched viewBox would distort stroke widths and label type. */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    setWidth(element.getBoundingClientRect().width)

    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}

const PADDING = { top: 16, right: 8, bottom: 28, left: 46 }
const Y_TICKS = 4

export function BalanceChart({
  points,
  currency = DEFAULT_CURRENCY,
  height = 260,
}: {
  points: BalancePoint[]
  currency?: string
  height?: number
}) {
  const gradientId = useId()
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 1)
  const plotHeight = Math.max(height - PADDING.top - PADDING.bottom, 1)

  const scale = useMemo(() => {
    if (points.length === 0) return null

    const values = points.map((p) => p.v)
    const times = points.map((p) => p.t)

    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    // Pad a flat series so it renders as a centred line rather than a divide-by-zero.
    const span = maxValue - minValue || Math.max(Math.abs(maxValue), 1)
    const lo = minValue - span * 0.12
    const hi = maxValue + span * 0.12

    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const timeSpan = maxTime - minTime || 1

    return {
      x: (t: number) => PADDING.left + ((t - minTime) / timeSpan) * plotWidth,
      y: (v: number) => PADDING.top + (1 - (v - lo) / (hi - lo)) * plotHeight,
      lo,
      hi,
    }
  }, [points, plotWidth, plotHeight])

  const geometry = useMemo(() => {
    if (!scale || points.length === 0 || width === 0) return null

    const coords = points.map((p) => ({ x: scale.x(p.t), y: scale.y(p.v) }))
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
    const baseline = PADDING.top + plotHeight
    const area = `${line} L${coords.at(-1)!.x},${baseline} L${coords[0].x},${baseline} Z`

    return { coords, line, area, baseline }
  }, [scale, points, width, plotHeight])

  const yTicks = useMemo(() => {
    if (!scale) return []
    return Array.from({ length: Y_TICKS + 1 }, (_, i) => {
      const value = scale.lo + ((scale.hi - scale.lo) * i) / Y_TICKS
      return { value, y: scale.y(value) }
    })
  }, [scale])

  const xTicks = useMemo(() => {
    if (!scale || points.length === 0) return []
    // ~70px per label keeps dates from colliding on narrow screens.
    const budget = Math.max(2, Math.floor(plotWidth / 70))
    const count = Math.min(budget, 6, points.length)
    const step = (points.length - 1) / Math.max(count - 1, 1)
    return Array.from({ length: count }, (_, i) => {
      const point = points[Math.round(i * step)]
      return {
        x: scale.x(point.t),
        label: new Date(point.t).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
        }),
      }
    })
  }, [scale, points, plotWidth])

  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!geometry) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left

    let nearest = 0
    let bestDistance = Infinity
    geometry.coords.forEach((coord, i) => {
      const distance = Math.abs(coord.x - x)
      if (distance < bestDistance) {
        bestDistance = distance
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  if (points.length === 0) {
    return (
      <div
        ref={wrapRef}
        className="grid place-items-center text-sm text-mist-500"
        style={{ height }}
      >
        No activity in this range.
      </div>
    )
  }

  const hovered =
    hoverIndex !== null && geometry ? { point: points[hoverIndex], coord: geometry.coords[hoverIndex] } : null

  // Flip the tooltip to the left of the cursor near the right edge so it
  // doesn't overflow the card.
  const tooltipFlipped = hovered ? hovered.coord.x > width - 130 : false

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      {width > 0 && geometry && scale && (
        <>
          <svg
            width={width}
            height={height}
            role="img"
            aria-label="Account balance over the selected period"
            onPointerMove={handleMove}
            onPointerLeave={() => setHoverIndex(null)}
            className="touch-none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-400)" stopOpacity="0.38" />
                <stop offset="100%" stopColor="var(--color-accent-600)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={PADDING.left}
                  x2={width - PADDING.right}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="currentColor"
                  className="text-white/6"
                />
                <text
                  x={PADDING.left - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="fill-mist-500 text-[10px]"
                >
                  {formatCompact(tick.value, currency)}
                </text>
              </g>
            ))}

            <path d={geometry.area} fill={`url(#${gradientId})`} />
            <path
              d={geometry.line}
              fill="none"
              stroke="var(--color-accent-400)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {xTicks.map((tick, i) => (
              <text
                key={`${tick.label}-${i}`}
                x={tick.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-mist-500 text-[10px]"
              >
                {tick.label}
              </text>
            ))}

            {hovered && (
              <g>
                <line
                  x1={hovered.coord.x}
                  x2={hovered.coord.x}
                  y1={PADDING.top}
                  y2={geometry.baseline}
                  stroke="var(--color-accent-400)"
                  strokeOpacity={0.5}
                  strokeDasharray="4 4"
                />
                <circle
                  cx={hovered.coord.x}
                  cy={hovered.coord.y}
                  r={9}
                  fill="var(--color-accent-400)"
                  fillOpacity={0.25}
                />
                <circle cx={hovered.coord.x} cy={hovered.coord.y} r={4.5} fill="var(--color-accent-400)" />
              </g>
            )}
          </svg>

          {hovered && (
            <div
              className="pointer-events-none absolute z-10 rounded-2xl border border-white/10 bg-ink-900/95 px-3.5 py-2.5 shadow-xl backdrop-blur"
              style={{
                left: tooltipFlipped ? hovered.coord.x - 126 : hovered.coord.x + 14,
                top: Math.max(hovered.coord.y - 46, 0),
              }}
            >
              <p className="text-[11px] whitespace-nowrap text-mist-400">
                {new Date(hovered.point.t).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-0.5 text-sm font-semibold whitespace-nowrap tabular-nums">
                {formatMoney(hovered.point.v, currency)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
