import { Footer } from '@/components/landing/Footer'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
      <Footer />
    </div>
  )
}
