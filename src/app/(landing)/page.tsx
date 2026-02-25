import { FAQSection } from '@/components/landing/faq-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { FinalCTA } from '@/components/landing/final-cta'
import { Footer } from '@/components/landing/footer'
import { HeroSection } from '@/components/landing/hero-section'
import { HowItWorks } from '@/components/landing/how-it-works'
import { PricingSection } from '@/components/landing/pricing-section'
import { ProblemSolution } from '@/components/landing/problem-solution'
import { SocialProof } from '@/components/landing/social-proof'

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
