'use client'

import { motion } from 'framer-motion'
import { Play } from 'lucide-react'

import { AudioWavesBackground } from '@/components/landing/AudioWavesBackground'
import { GridBackground } from '@/components/landing/GridBackground'
import { AnimatedTooltip } from '@/components/ui/animated-tooltip'
import { Button } from '@/components/ui/button'
import { STATS } from '@/lib/constants'

const musicians = [
  {
    id: 1,
    name: 'Céline',
    designation: 'Jazz Pianist',
    image: '/users/celine.jpg',
  },
  {
    id: 2,
    name: 'Louis',
    designation: 'Guitar Teacher',
    image: '/users/louis.jpg',
  },
  {
    id: 3,
    name: 'Nathan',
    designation: 'Classical Violinist',
    image: '/users/nathan.jpg',
  },
  {
    id: 4,
    name: 'Shan',
    designation: 'Music Producer',
    image: '/users/shan.jpg',
  },
  {
    id: 5,
    name: 'Yafei',
    designation: 'Composer',
    image: '/users/yafei.jpg',
  },
]

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 overflow-hidden">
      <GridBackground />
      <AudioWavesBackground />
      <div className="max-w-7xl mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            Transform Any Song Into{' '}
            <span className="bg-gradient-to-r from-primary via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Sheet Music
            </span>{' '}
            in Seconds
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            AI-powered music transcription that automatically separates every
            instrument from YouTube videos, audio files, or live recordings. No
            music theory required.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 justify-center items-center mb-8">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 cursor-pointer text-primary-foreground font-semibold text-base px-6 py-3 sm:px-8 sm:py-4 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Transcribing Free
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white/20 hover:bg-white/10 text-white hover:text-white font-medium px-5 py-3 sm:px-6 sm:py-4 h-auto rounded-xl cursor-pointer group"
            >
              <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
              Watch Demo (45s)
            </Button>
          </div>

          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center">
              <AnimatedTooltip items={musicians} />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Join {STATS.musicians}+ musicians who save 5+ hours per
              transcription
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
