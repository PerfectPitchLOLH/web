import { HOSTING_PROVIDERS, LEGAL_IDENTITY } from '@/lib/legal-identity'

export function MentionsContent() {
  return (
    <>
      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Éditeur du site
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        {LEGAL_IDENTITY.companyName}
        <br />
        {LEGAL_IDENTITY.legalForm} au capital de {LEGAL_IDENTITY.shareCapital}
        <br />
        SIRET : {LEGAL_IDENTITY.siret} — {LEGAL_IDENTITY.registration}
        <br />
        TVA intracommunautaire : {LEGAL_IDENTITY.vatNumber}
        <br />
        Siège social : {LEGAL_IDENTITY.headOfficeAddress}
        <br />
        Téléphone : {LEGAL_IDENTITY.phone}
        <br />
        Email : {LEGAL_IDENTITY.contactEmail}
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Directeur de la publication
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        {LEGAL_IDENTITY.publicationDirector}
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Hébergeurs
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Application web :
        <br />
        {HOSTING_PROVIDERS.web.name}
        <br />
        {HOSTING_PROVIDERS.web.address}
        <br />
        Site web : {HOSTING_PROVIDERS.web.website}
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Serveur d&apos;API de traitement :
        <br />
        {HOSTING_PROVIDERS.api.name}
        <br />
        {HOSTING_PROVIDERS.api.address}
        <br />
        Site web : {HOSTING_PROVIDERS.api.website}
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Conception et réalisation
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notavex — service de transcription musicale par intelligence
        artificielle.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Contact RGPD
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Pour toute demande relative à vos données personnelles (accès,
        rectification, suppression), contactez notre contact dédié à la
        protection des données : {LEGAL_IDENTITY.privacyEmail}.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Propriété intellectuelle
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        L&apos;ensemble des contenus présents sur le site notavex.com (textes,
        images, interface graphique, logotype, algorithmes) est protégé par le
        droit de la propriété intellectuelle et reste la propriété exclusive de{' '}
        {LEGAL_IDENTITY.companyName}, sauf mention contraire. Toute
        reproduction, représentation, modification ou exploitation non autorisée
        est strictement interdite.
      </p>
    </>
  )
}
