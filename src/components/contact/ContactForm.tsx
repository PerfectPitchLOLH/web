'use client'

import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/ui/inline-alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useContactForm } from '@/hooks/useContactForm'
import {
  CONTACT_CATEGORIES,
  CONTACT_CATEGORY_LABELS,
} from '@/server/domains/contact/contact.constants'
import type { ContactCategory } from '@/server/domains/contact/contact.types'

const fieldClassName =
  'border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:border-white/30 focus-visible:ring-white/20'

export function ContactForm() {
  const {
    isAuthenticated,
    isLoadingSession,
    sessionName,
    sessionEmail,
    submit,
    loading,
    error,
    success,
  } = useContactForm()

  const [category, setCategory] = useState<ContactCategory>(
    CONTACT_CATEGORIES[0],
  )
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await submit(
        isAuthenticated
          ? { category, message }
          : { category, message, name, email },
      )
      setMessage('')
      setName('')
      setEmail('')
    } catch {
      // l'erreur est exposée via `error` retourné par useContactForm
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[480px] rounded-2xl px-6 py-8 text-left sm:px-8"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="mb-5">
        <Label htmlFor="contact-category" className="mb-2 text-white/70">
          Catégorie
        </Label>
        <Select
          value={category}
          onValueChange={(value) => setCategory(value as ContactCategory)}
        >
          <SelectTrigger
            id="contact-category"
            className={`w-full ${fieldClassName}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#15101f] text-white">
            {CONTACT_CATEGORIES.map((value) => (
              <SelectItem
                key={value}
                value={value}
                className="focus:bg-white/10 focus:text-white"
              >
                {CONTACT_CATEGORY_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isAuthenticated && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="contact-name" className="mb-2 text-white/70">
              Nom
            </Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Votre nom"
              required
              minLength={2}
              maxLength={100}
              disabled={isLoadingSession}
              className={fieldClassName}
            />
          </div>
          <div>
            <Label htmlFor="contact-email" className="mb-2 text-white/70">
              Email
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@exemple.com"
              required
              disabled={isLoadingSession}
              className={fieldClassName}
            />
          </div>
        </div>
      )}

      {isAuthenticated && (
        <p className="mb-5 text-[13px] text-white/45">
          Envoyé en tant que{' '}
          <span className="text-white/70">{sessionName}</span>
          {sessionEmail && ` (${sessionEmail})`}
        </p>
      )}

      <div className="mb-6">
        <Label htmlFor="contact-message" className="mb-2 text-white/70">
          Message
        </Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Décrivez votre question ou votre problème..."
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className={fieldClassName}
        />
      </div>

      {error && (
        <InlineAlert variant="destructive" message={error} className="mb-4" />
      )}
      {success && (
        <InlineAlert
          variant="default"
          message="Votre message a bien été envoyé — on revient vers vous rapidement."
          className="mb-4 border-white/10 bg-white/5 text-white"
        />
      )}

      <Button
        type="submit"
        disabled={loading || isLoadingSession}
        className="h-[44px] w-full rounded-full bg-white text-[15px] font-semibold text-[#0a0612] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(255,107,53,0.35)]"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Envoyer le message
      </Button>
    </form>
  )
}
