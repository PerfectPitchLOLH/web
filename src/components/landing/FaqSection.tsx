'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const faqs = [
  {
    question: 'How does AI music transcription work?',
    answer:
      'Notavex uses advanced AI algorithms to analyze audio files and separate individual instruments using stem separation technology. The AI then converts each instrument into accurate sheet music notation, preserving pitch, rhythm, and dynamics.',
  },
  {
    question: 'Can I transcribe music from YouTube videos?',
    answer:
      'Yes! Simply paste any YouTube URL into Notavex and our AI will automatically extract the audio, separate all instruments, and generate sheet music. This works with any public YouTube video including songs, tutorials, and live performances.',
  },
  {
    question: 'What audio formats does Notavex support?',
    answer:
      'Notavex supports all common audio formats including MP3, WAV, FLAC, M4A, OGG, and AAC. You can upload files directly from your computer or import from YouTube, Spotify, and SoundCloud links.',
  },
  {
    question: 'How accurate is the AI transcription?',
    answer:
      'Our AI achieves 95%+ accuracy on most recordings. Accuracy depends on audio quality, mixing clarity, and instrumentation complexity. Clean studio recordings produce near-perfect transcriptions, while live recordings may require minor manual adjustments.',
  },
  {
    question: 'Is there a free plan available?',
    answer:
      'Yes! Our Free plan includes 3 transcriptions per month, YouTube import, basic instrument separation, and sheet music export. Perfect for students and hobbyists learning new songs.',
  },
  {
    question: 'Can I export sheet music to different formats?',
    answer:
      'Absolutely! Notavex exports to MusicXML, PDF, MIDI, and proprietary formats for Sibelius, Finale, and MuseScore. This ensures compatibility with any music notation software you use.',
  },
  {
    question: 'How long does transcription take?',
    answer:
      'Most songs are transcribed in 30-90 seconds depending on length and complexity. A 3-minute pop song typically takes 45 seconds, while a 10-minute orchestral piece may take 2-3 minutes.',
  },
  {
    question: 'Do I need music theory knowledge to use Notavex?',
    answer:
      "No music theory required! Notavex handles all the technical work automatically. Simply upload your audio, select which instruments to transcribe, and download professional sheet music. It's designed for musicians of all skill levels.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about AI music transcription
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="border border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                aria-expanded={openIndex === index}
              >
                <h3 className="text-lg font-semibold pr-4">{faq.question}</h3>
                <ChevronDown
                  className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-5 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground mb-4">
            Still have questions? We&apos;re here to help.
          </p>
          <button className="text-primary hover:text-primary/80 font-semibold transition-colors cursor-pointer">
            Contact Support →
          </button>
        </motion.div>
      </div>
    </section>
  )
}
