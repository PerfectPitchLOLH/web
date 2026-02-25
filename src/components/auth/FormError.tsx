'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'

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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
