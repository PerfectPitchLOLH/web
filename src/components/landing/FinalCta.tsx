'use client'

import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { STATS } from '@/lib/constants'

export function FinalCTA() {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />

      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            var(--primary) 2px,
            var(--primary) 3px
          )`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative max-w-4xl mx-auto text-center"
      >
        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          Join Thousands of Musicians <br />
          <span className="text-primary">
            Transcribing Unlimited Sheet Music
          </span>
        </h2>

        <p className="text-lg text-muted-foreground mb-8">
          Start your 14-day free trial. No credit card required.
        </p>

        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-12 py-6 h-auto rounded-xl shadow-[0_8px_24px_rgba(255,107,53,0.3)] hover:shadow-[0_12px_32px_rgba(255,107,53,0.4)] transition-all hover:-translate-y-0.5"
        >
          Start Transcribing Free
        </Button>

        <p className="mt-6 text-sm text-muted-foreground">
          ⭐⭐⭐⭐⭐ {STATS.rating}/5 from {STATS.reviewCount} musicians
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Want to see it first?{' '}
          <button className="text-primary hover:underline">
            Watch 45s Demo
          </button>
        </p>
      </motion.div>
    </section>
  )
}
