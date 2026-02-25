'use client'

import { motion } from 'framer-motion'
import {
  ArrowDown,
  Clock,
  DollarSign,
  Music,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

const problems = [
  {
    icon: DollarSign,
    title: 'Expensive Per-Score Model',
    description:
      "Buying individual sheet music costs $5-15 per song. Learn 100 songs? That's $500-1,500.",
  },
  {
    icon: Search,
    title: "Can't Find Obscure Songs",
    description:
      "Love an indie track or live performance? Traditional sheet music probably doesn't exist for it.",
  },
  {
    icon: Clock,
    title: 'Transcribing Takes Hours',
    description:
      'Learning songs by ear requires advanced musical skills and 3-5 hours per song. Tedious and error-prone.',
  },
]

const solutions = [
  {
    icon: Sparkles,
    title: 'Unlimited Transcriptions',
    description:
      'One flat subscription. Generate as many scores as you want. Learn 1 song or 1,000—same price.',
  },
  {
    icon: Music,
    title: 'Works With Everything',
    description:
      'YouTube videos, MP3s, Spotify recordings, live performances. If you can hear it, we can transcribe it.',
  },
  {
    icon: Zap,
    title: 'Ready in Seconds',
    description:
      'Upload audio or paste a YouTube link. Our AI separates instruments and generates sheet music instantly.',
  },
]

export function ProblemSolution() {
  return (
    <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
            THE OLD WAY IS BROKEN
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Stop Wasting Money and Time on Sheet Music
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {problems.map((problem, index) => {
            const Icon = problem.icon
            return (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-2xl bg-card border border-destructive/20 hover:border-destructive/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{problem.title}</h3>
                <p className="text-muted-foreground">{problem.description}</p>
              </motion.div>
            )
          })}
        </div>

        <div className="flex justify-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-2 text-accent"
          >
            <span className="text-lg font-medium">
              There&apos;s a better way
            </span>
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold">
            One Subscription. Unlimited Sheet Music.{' '}
            <span className="text-primary">Every Instrument.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {solutions.map((solution, index) => {
            const Icon = solution.icon
            return (
              <motion.div
                key={solution.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-2xl bg-card border border-primary/40 hover:border-primary/60 hover:shadow-[0_0_30px_rgba(255,107,53,0.15)] transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{solution.title}</h3>
                <p className="text-muted-foreground">{solution.description}</p>
              </motion.div>
            )
          })}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-primary/40 hover:bg-primary/10 text-foreground"
          >
            See How It Works
          </Button>
        </div>
      </div>
    </section>
  )
}
