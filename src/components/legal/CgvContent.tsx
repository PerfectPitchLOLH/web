import { LEGAL_IDENTITY } from '@/lib/legal-identity'

export function CgvContent() {
  return (
    <>
      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Article 1 — Vendeur
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        {LEGAL_IDENTITY.companyName}, {LEGAL_IDENTITY.legalForm} au capital de{' '}
        {LEGAL_IDENTITY.shareCapital}, immatriculée sous le numéro SIRET{' '}
        {LEGAL_IDENTITY.siret} ({LEGAL_IDENTITY.registration}), dont le siège
        social est situé {LEGAL_IDENTITY.headOfficeAddress} (ci-après «{' '}
        {LEGAL_IDENTITY.brandName} »). Numéro de TVA intracommunautaire :{' '}
        {LEGAL_IDENTITY.vatNumber}. Contact commercial :{' '}
        {LEGAL_IDENTITY.contactEmail}.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Article 2 — Produits et prix
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notavex propose les produits suivants :
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          Abonnement mensuel avec crédits de transcription renouvelables chaque
          mois
        </li>
        <li>
          Abonnement annuel avec crédits de transcription renouvelables chaque
          mois
        </li>
        <li>Packs de crédits supplémentaires à l&apos;achat ponctuel</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Les prix sont affichés toutes taxes comprises (TTC) en euros. La TVA
        applicable est celle en vigueur au moment de la commande conformément à
        la réglementation française et européenne. Notavex se réserve le droit
        de modifier ses tarifs à tout moment, sans effet rétroactif sur les
        abonnements en cours.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Article 3 — Paiement
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Les paiements sont traités de manière sécurisée par Stripe, prestataire
        de services de paiement certifié PCI DSS niveau 1. Notavex ne stocke
        aucune donnée bancaire. Les moyens de paiement acceptés sont les cartes
        bancaires (Visa, Mastercard, American Express) et les autres moyens
        proposés par Stripe selon votre pays.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Article 4 — Droit de rétractation
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Conformément à l&apos;article L221-18 du Code de la consommation, tout
        consommateur dispose d&apos;un délai de quatorze (14) jours calendaires
        à compter de la souscription pour exercer son droit de rétractation,
        sans avoir à justifier de motifs ni à payer de pénalités.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Conformément à l&apos;article L221-28 du Code de la consommation, le
        droit de rétractation ne peut être exercé pour les contrats de
        fourniture d&apos;un contenu numérique non fourni sur un support
        matériel dont l&apos;exécution a commencé avec l&apos;accord préalable
        exprès du consommateur et renoncement exprès à son droit de
        rétractation.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Avant tout paiement, le consommateur est invité à cocher une case par
        laquelle il demande l&apos;exécution immédiate de sa commande (accès au
        service et crédits de transcription mis à disposition dès le paiement)
        et renonce expressément à son droit de rétractation. Cette case est
        obligatoire : sans elle, la commande ne peut pas être validée.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notavex conserve la preuve de ce consentement : la date et l&apos;heure
        de la commande ainsi que la version des présentes CGV en vigueur sont
        enregistrées avec le paiement.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Pour toute demande relative au droit de rétractation, contactez-nous à{' '}
        {LEGAL_IDENTITY.contactEmail}.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Article 5 — Remboursements
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        En cas d&apos;exercice valide du droit de rétractation, le remboursement
        est effectué dans un délai de quatorze (14) jours sur le moyen de
        paiement utilisé lors de la commande. Hors droit légal de rétractation,
        aucun remboursement partiel pour période non consommée n&apos;est
        accordé.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Article 6 — Résiliation
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        L&apos;abonnement peut être résilié à tout moment depuis l&apos;espace
        client dans la section « Abonnement ». La résiliation prend effet à la
        fin de la période d&apos;abonnement en cours. L&apos;accès au service
        reste actif jusqu&apos;à cette date.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        Article 7 — Droit applicable
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Les présentes CGV sont soumises au droit français. Tout litige relève de
        la compétence exclusive des tribunaux de Paris.
      </p>
    </>
  )
}
