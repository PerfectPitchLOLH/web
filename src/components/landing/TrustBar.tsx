'use client'

import { motion } from 'framer-motion'

const platforms = [
  { name: 'YouTube', icon: '▶' },
  { name: 'Spotify', icon: '♫' },
  { name: 'SoundCloud', icon: '☁' },
  { name: 'Apple Music', icon: '🎵' },
  { name: 'Logic Pro', icon: '⚡' },
  { name: 'Ableton', icon: '◐' },
  { name: 'FL Studio', icon: '🎹' },
]

export function TrustBar() {
  return (
    <section className="py-8 border-y border-border bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground mb-6">
          Works with audio from
        </p>

        <div className="relative overflow-hidden">
          <motion.div
            className="flex gap-12 items-center justify-center flex-wrap"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {platforms.map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-2xl">{platform.icon}</span>
                <span className="text-sm font-medium">{platform.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
