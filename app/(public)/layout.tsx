/**
 * Public Layout - Forces Light Mode
 *
 * Public pages (rebook, mayday confirmation) should always display in light mode
 * to ensure proper contrast and logo visibility, regardless of user's system theme.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="light" style={{ colorScheme: 'light' }}>
      {children}
    </div>
  )
}
