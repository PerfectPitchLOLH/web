import { Navbar } from '@/components/landing/navbar/Navbar'
import { NavbarCTA } from '@/components/landing/navbar/navbarCta'

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar cta={<NavbarCTA className="hidden md:flex" />} />
      {children}
    </>
  )
}
