'use client'

import { motion } from 'framer-motion'
import { Home, Music } from 'lucide-react'
import Link from 'next/link'

import { AudioWavesBackground } from '@/components/landing/AudioWavesBackground'
import { GridBackground } from '@/components/landing/GridBackground'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground relative flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      <GridBackground />
      <AudioWavesBackground />

      <div className="max-w-4xl mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.2,
              type: 'spring',
              stiffness: 200,
            }}
            className="mb-8"
          >
            <h1 className="text-9xl sm:text-[12rem] lg:text-[16rem] font-bold tracking-tight leading-none">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                404
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Music className="w-8 h-8 text-primary animate-pulse" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                Note Not Found
              </h2>
              <Music className="w-8 h-8 text-accent animate-pulse" />
            </div>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Looks like this page hit a wrong note and went off-key.
              <br />
              Let&apos;s get you back on track!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
              <Link href="/">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base px-8 py-4 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  <Home className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform duration-300" />
                  Back to Home
                </Button>
              </Link>

              <Link href="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/20 hover:bg-white/10 text-white hover:text-white font-medium px-8 py-4 h-auto rounded-xl group"
                >
                  <Music className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-16"
          >
            <p className="text-sm text-muted-foreground">
              Error Code: 404 | Page Not Found
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
