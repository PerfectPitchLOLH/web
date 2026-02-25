'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useState } from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { PRICING, STATS } from '@/lib/constants'

const features = [
  'Unlimited song transcriptions',
  'Multi-instrument separation',
  'All export formats (PDF, MIDI, MusicXML)',
  'Editable sheet music',
  'Cloud storage & sync',
  'Priority support',
  'Collaboration tools',
  'Early access to new features',
]

const faqs = [
  {
    question: 'Can I try before I buy?',
    answer: `Yes. Start a ${PRICING.trialDays}-day free trial with full access to all features. No credit card required. Cancel anytime.`,
  },
  {
    question: 'What happens after my free trial?',
    answer:
      "You'll be prompted to enter payment details. If you don't subscribe, your account remains free with limited access (1 transcription per month).",
  },
  {
    question: 'Can I cancel my subscription?',
    answer:
      'Absolutely. Cancel anytime from your account settings. No cancellation fees. If you cancel mid-cycle, you retain access until the end of your billing period.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      "Yes. We offer a 30-day money-back guarantee on annual plans. If you're not satisfied within 30 days, we'll refund your entire payment.",
  },
  {
    question: 'Is there a limit on song length or file size?',
    answer:
      'Songs up to 15 minutes and files up to 100MB are supported. Need longer? Contact support for custom solutions.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, Amex, Discover) and PayPal.',
  },
]

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)

  const price = isAnnual ? PRICING.annual : PRICING.monthly
  const priceLabel = isAnnual ? 'year' : 'month'
  const savings = isAnnual ? `save $${PRICING.annualSavings}` : null

  return (
    <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            One Simple Price.{' '}
            <span className="text-primary">Unlimited Transcriptions.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No per-score fees. No hidden costs. Just unlimited access to the
            most advanced AI transcription platform.
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <span
            className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            Monthly
          </span>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <span
            className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            Annual
            {savings && (
              <span className="ml-2 inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                Save 20%
              </span>
            )}
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto mb-16"
        >
          <div className="relative rounded-3xl bg-gradient-to-b from-card to-card/50 border-2 border-primary shadow-[0_16px_48px_rgba(255,107,53,0.2)] p-8">
            <div className="text-center mb-8">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
                PROFESSIONAL
              </h3>
              <div className="mb-2">
                <span className="text-6xl font-bold">${price}</span>
                <span className="text-xl text-muted-foreground">
                  /{priceLabel}
                </span>
              </div>
              {isAnnual && (
                <p className="text-sm text-muted-foreground">
                  or ${PRICING.monthly}/month billed monthly ({savings})
                </p>
              )}
            </div>

            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
            >
              Start {PRICING.trialDays}-Day Free Trial
            </Button>

            <div className="text-center mt-4 space-y-1">
              <p className="text-sm text-muted-foreground">
                No credit card required
              </p>
              <p className="text-sm text-muted-foreground">Cancel anytime</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto mb-12"
        >
          <h3 className="text-2xl font-bold text-center mb-6">
            See How Much You&apos;ll Save
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-border rounded-xl overflow-hidden">
              <thead className="bg-card">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold"></th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Traditional Sheet Music
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-primary">
                    Notavex
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card/50">
                <tr className="border-t border-border">
                  <td className="px-6 py-4 text-sm">Cost per song</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    $5 - $15
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-primary">
                    Unlimited
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-6 py-4 text-sm">10 songs/month</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    $50 - $150
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-primary">
                    ${PRICING.monthly}
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-6 py-4 text-sm">50 songs/month</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    $250 - $750
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-primary">
                    ${PRICING.monthly}
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-6 py-4 text-sm">100 songs/year</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    $500 - $1,500
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-primary">
                    ${PRICING.annual}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h3 className="text-2xl font-bold text-center mb-8">
            Common Questions
          </h3>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <h3 className="text-2xl font-bold mb-4">
            Ready to Transform Your Practice?
          </h3>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-lg font-semibold px-12"
          >
            Start Your Free Trial
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Join {STATS.musicians} musicians transcribing unlimited sheet music
          </p>
        </motion.div>
      </div>
    </section>
  )
}
