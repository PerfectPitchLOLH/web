import { Navbar } from '@/components/landing/navbar/Navbar'
import { NavbarCTA } from '@/components/landing/navbar/navbarCta'

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,144,500;1,144,600&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <Navbar cta={<NavbarCTA className="hidden md:flex" />} />
      {children}
    </>
  )
}
