'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

import { STATS } from '@/lib/constants'

const testimonials = [
  {
    name: 'Sarah M.',
    role: 'Guitar Student',
    location: 'Austin, TX',
    quote:
      "I've saved over $400 in sheet music costs in 3 months. Notavex made learning guitar affordable and fun.",
    avatar: '🎸',
  },
  {
    name: 'James K.',
    role: 'Session Musician',
    location: 'Nashville, TN',
    quote:
      'As a session guitarist, I used to spend 4-5 hours transcribing songs for clients. Now it takes minutes. This tool paid for itself in one week.',
    avatar: '🎤',
  },
  {
    name: 'Dr. Lisa Chen',
    role: 'Music Educator',
    location: 'Berklee College of Music',
    quote:
      'I create customized lesson materials for 30+ students. The multi-instrument separation feature is a game-changer for teaching orchestration.',
    avatar: '🎹',
  },
  {
    name: 'Alex T.',
    role: 'Electronic Music Producer',
    location: 'Los Angeles, CA',
    quote:
      "The accuracy is impressive. I use Notavex to analyze chord progressions and arrangements from my favorite producers. It's like having X-ray vision for music.",
    avatar: '🎧',
  },
  {
    name: 'The Midnight Groove',
    role: 'Cover Band',
    location: 'Chicago, IL',
    quote:
      'Our cover band learned 20 songs in 2 months. Being able to separate drums, bass, and guitar parts individually was huge for us.',
    avatar: '🎵',
  },
  {
    name: 'Maria S.',
    role: 'Violinist',
    location: 'New York Philharmonic',
    quote:
      "I was skeptical about AI transcription, but Notavex captured subtle dynamics and articulations I didn't expect. Excellent for studying concertos.",
    avatar: '🎻',
  },
]

const stats = [
  { value: STATS.musicians, label: 'Musicians' },
  { value: STATS.songsTranscribed, label: 'Songs Transcribed' },
  { value: STATS.countries, label: 'Countries' },
]

export function SocialProof() {
  return (
    <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-12">
            Trusted by <span className="text-primary">Musicians Worldwide</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto mb-16">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </div>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={`star-${testimonial.name}-${i}`}
                    className="w-4 h-4 fill-primary text-primary"
                  />
                ))}
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {testimonial.quote}
              </p>

              <div className="text-xs text-muted-foreground/70">
                📍 {testimonial.location}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-12 border-t border-border"
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={`rating-star-${i}`}
                  className="w-5 h-5 fill-primary text-primary"
                />
              ))}
            </div>
            <span className="text-sm font-semibold">
              {STATS.rating}/5 from {STATS.reviewCount} reviews
            </span>
          </div>

          <div className="px-4 py-2 bg-primary/10 text-primary text-sm font-semibold rounded-full">
            30-Day Money Back Guarantee
          </div>

          <div className="text-sm text-muted-foreground">
            Used by 50+ Music Schools
          </div>
        </motion.div>
      </div>
    </section>
  )
}
