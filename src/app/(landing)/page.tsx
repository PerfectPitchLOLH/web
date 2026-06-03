import { FAQSection } from '@/components/landing/FaqSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { FinalCTA } from '@/components/landing/FinalCta'
import { Footer } from '@/components/landing/Footer'
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { PricingSection } from '@/components/landing/PricingSection'
import { ProblemSolution } from '@/components/landing/ProblemSolution'
import { SocialProof } from '@/components/landing/SocialProof'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div id="overview">
        <HeroSection />
      </div>
      <ProblemSolution />
      <div id="features">
        <FeaturesSection />
      </div>
      <HowItWorks />
      <SocialProof />
      <div id="pricing">
        <PricingSection />
      </div>
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  )
}
