import type { Tag } from '@/lib/types/ticket'

export function TagPill({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
      style={{
        backgroundColor: `${tag.color}14`,
        color: tag.color,
      }}
    >
      {tag.name}
    </span>
  )
}
