import type { Tag } from '@/lib/types/ticket'

export function TagPill({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        borderColor: tag.color,
        borderWidth: '1px'
      }}
    >
      {tag.name}
    </span>
  )
}
