const toComplete = (label: string) => `[${label} — À COMPLÉTER]`

export const CGV_VERSION = '2026-09-21'

export const LEGAL_IDENTITY = {
  brandName: 'Notavex',
  companyName: toComplete('Dénomination sociale'),
  legalForm: toComplete('Forme juridique'),
  shareCapital: toComplete('Capital social'),
  siret: toComplete('SIRET'),
  registration: toComplete('Numéro et ville du RCS'),
  vatNumber: toComplete('N° de TVA intracommunautaire'),
  headOfficeAddress: toComplete('Adresse du siège social'),
  phone: toComplete('Numéro de téléphone'),
  publicationDirector: toComplete('Directeur de la publication'),
  contactEmail: 'contact@notavex.com',
  privacyEmail: 'privacy@notavex.com',
} as const

export const HOSTING_PROVIDERS = {
  web: {
    name: 'Vercel Inc.',
    address: '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
    website: 'vercel.com',
  },
  api: {
    name: toComplete("Nom de l'hébergeur du serveur d'API"),
    address: toComplete("Adresse de l'hébergeur du serveur d'API"),
    website: toComplete("Site web de l'hébergeur du serveur d'API"),
  },
} as const
