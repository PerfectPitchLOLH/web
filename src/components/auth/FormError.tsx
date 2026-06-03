'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { InlineAlert } from '@/components/ui/inline-alert'

type Props = {
  error?: string
}

export function FormError({ error }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (error) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <AnimatePresence mode="wait">
      {visible && error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <InlineAlert message={error} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
