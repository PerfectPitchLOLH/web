'use client'

import { motion } from 'framer-motion'
import {
  Cloud,
  Download,
  Edit3,
  Music2,
  Play,
  Upload,
  Users,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: Music2,
    title: 'Automatic Instrument Detection',
    description:
      'Upload any audio and our AI identifies every instrument—piano, guitar, drums, bass, vocals, strings, and more.',
  },
  {
    icon: Upload,
    title: 'Works With Any Audio Source',
    description:
      'Paste YouTube links, upload MP3/WAV files, or record live audio directly in the app. No conversion needed.',
  },
  {
    icon: Zap,
    title: 'Get Results in Seconds',
    description:
      'Most songs transcribe in under 60 seconds. No waiting hours for processing.',
  },
  {
    icon: Edit3,
    title: 'Edit and Customize',
    description:
      'Fine-tune generated transcriptions with our built-in notation editor. Adjust notes, rhythms, and dynamics.',
  },
  {
    icon: Download,
    title: 'Export to Any Format',
    description:
      'Download as PDF, MusicXML, MIDI, or Guitar Pro. Compatible with Finale, Sibelius, MuseScore, and more.',
  },
  {
    icon: Play,
    title: 'Interactive Playback Modes',
    description:
      'Standard notation, guitar tabs, or falling-notes visualization for visual learners.',
  },
  {
    icon: Cloud,
    title: 'Access From Anywhere',
    description:
      'All your transcriptions saved in the cloud. Access from desktop, tablet, or mobile.',
  },
  {
    icon: Users,
    title: 'Share With Your Band',
    description:
      'Share transcriptions with bandmates or students. Collaborate on arrangements together.',
  },
]

export function FeaturesSection() {
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
            Everything You Need to Transform{' '}
            <span className="text-primary">Audio Into Music</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-6 rounded-2xl border border-border hover:border-primary/40 hover:bg-card/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
