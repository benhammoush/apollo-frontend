/**
 * ApolloLogo — 4 animated isometric cubes
 *
 * No background, no main static cube.
 * Cascade from top-left (largest) to bottom-right (smallest).
 * Animation driven by global CSS in main.tsx (.apollo-sc1–4).
 */
interface Props {
  size?: number  // height = width (square viewBox)
}

export default function ApolloLogo({ size = 28 }: Props) {
  const s3 = Math.sqrt(3) / 2  // cos(30°) ≈ 0.866

  // Cascade: top-left → bottom-right, each cube smaller + more transparent
  // ViewBox "0 0 58 56"
  const cubes: [number, number, number, string, number][] = [
    [12, 13, 10,  'apollo-sc apollo-sc1', 1.00],
    [24, 24, 8.5, 'apollo-sc apollo-sc2', 0.82],
    [34, 33, 7.5, 'apollo-sc apollo-sc3', 0.65],
    [44, 41, 6.5, 'apollo-sc apollo-sc4', 0.48],
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 58 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {cubes.map(([cx, cy, a, cls, op]) => (
        <Cube key={cls} cx={cx} cy={cy} a={a} cls={cls} op={op} s3={s3} />
      ))}
    </svg>
  )
}

// ── Mini isometric cube ───────────────────────────────────────────────────────

type P = [number, number]
const pp = (...pts: P[]) => pts.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(' ')

interface CubeProps { cx: number; cy: number; a: number; cls: string; op: number; s3: number }

function Cube({ cx, cy, a, cls, op, s3 }: CubeProps) {
  // 6 hex vertices + front-center
  const V0: P = [cx,        cy - a]
  const V1: P = [cx + a*s3, cy - a * 0.5]
  const V2: P = [cx + a*s3, cy + a * 0.5]
  const V3: P = [cx,        cy + a]
  const V4: P = [cx - a*s3, cy + a * 0.5]
  const V5: P = [cx - a*s3, cy - a * 0.5]
  const FC: P = [cx,        cy]

  // Stroke width proportional to cube size
  const sw = Math.max(0.9, a * 0.13)

  // Three visible faces, each slightly different brightness for 3-D depth
  const topStroke   = `rgba(240,248,255,${op})`
  const rightStroke = `rgba(210,228,252,${op * 0.92})`
  const leftStroke  = `rgba(185,210,248,${op * 0.82})`

  return (
    <g className={cls}>
      {/* Top face — brightest */}
      <polygon
        points={pp(V0, V1, FC, V5)}
        fill={`rgba(255,255,255,${op * 0.11})`}
        stroke={topStroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Right face */}
      <polygon
        points={pp(V1, V2, V3, FC)}
        fill={`rgba(200,220,255,${op * 0.055})`}
        stroke={rightStroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Left face — most shadowed */}
      <polygon
        points={pp(V5, FC, V3, V4)}
        fill={`rgba(170,200,255,${op * 0.035})`}
        stroke={leftStroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
    </g>
  )
}
