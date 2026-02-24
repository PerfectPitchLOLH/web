'use client'

import { motion } from 'framer-motion'
import { Cpu, Download, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'

const steps = [
  {
    number: '1',
    icon: Upload,
    title: 'Upload Your Audio',
    description:
      'Paste a YouTube URL, upload an MP3/WAV file, or record directly in the app. No file conversion needed.',
  },
  {
    number: '2',
    icon: Cpu,
    title: 'AI Analyzes & Separates',
    description:
      'Our AI detects instruments, separates tracks, and transcribes each part. Takes 30-60 seconds.',
  },
  {
    number: '3',
    icon: Download,
    title: 'Download or Edit',
    description:
      'Review, edit if needed, and export in your preferred format (PDF, MIDI, MusicXML, Guitar Pro).',
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            From Audio to Sheet Music in{' '}
            <span className="text-primary">3 Simple Steps</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-10 h-10 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                      {step.number}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>

                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </motion.div>
            )
          })}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Try It Now - It&apos;s Free
          </Button>
        </div>
      </div>
    </section>
  )
}
