import type { ReactNode } from 'react'

interface StepHeadingProps {
  index: string
  title: string
  children?: ReactNode
}

/** Eyebrow + display heading for a step in the booking sequence. */
export default function StepHeading({ index, title, children }: StepHeadingProps) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
      <h2 className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-muted-foreground">{index}</span>
        <span className="font-display text-xl font-medium tracking-tight">{title}</span>
      </h2>
      {children}
    </div>
  )
}
