import { Footer } from '@/components/landing/Footer'
import { HeroSection } from '@/components/landing/HeroSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { SocialProof } from '@/components/landing/SocialProof'

export default function Home() {
  return (
    <main style={{ background: 'var(--nv-bg-0)', color: 'white' }}>
      <HeroSection />
      <PricingSection />
      <SocialProof />
      <Footer />
    </main>
  )
}
