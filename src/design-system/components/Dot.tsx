interface DotProps { color: string }

export default function Dot({ color }: DotProps) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
}
