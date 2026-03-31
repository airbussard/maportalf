import Link from 'next/link'

interface BreadcrumbProps {
  pageName: string
  items?: { label: string; href?: string }[]
}

export function Breadcrumb({ pageName, items }: BreadcrumbProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-[26px] font-bold leading-[30px] text-foreground">
        {pageName}
      </h2>
      <nav>
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link className="font-medium text-muted-foreground hover:text-foreground" href="/dashboard">
              Dashboard /
            </Link>
          </li>
          {items?.map((item, i) => (
            <li key={i}>
              {item.href ? (
                <Link className="font-medium text-muted-foreground hover:text-foreground" href={item.href}>
                  {item.label} /
                </Link>
              ) : (
                <span className="font-medium text-muted-foreground">{item.label} /</span>
              )}
            </li>
          ))}
          <li className="font-medium text-[#fbb928]">{pageName}</li>
        </ol>
      </nav>
    </div>
  )
}
