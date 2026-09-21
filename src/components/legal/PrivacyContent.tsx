import { HOSTING_PROVIDERS, LEGAL_IDENTITY } from '@/lib/legal-identity'

const PROCESSORS = [
  {
    name: 'Stripe',
    purpose: 'paiement',
    detail:
      'la page de paiement est hébergée par Stripe, qui traite les données de carte bancaire et de facturation ; Notavex ne les stocke pas. Traitement possible aux États-Unis.',
  },
  {
    name: 'Resend',
    purpose: 'emails transactionnels',
    detail:
      'adresse email, nom et contenu des messages envoyés (vérification du compte, réinitialisation du mot de passe, notifications de paiement). Traitement possible aux États-Unis.',
  },
  {
    name: 'Neon',
    purpose: 'base de données PostgreSQL',
    detail:
      'comptes, partitions, crédits et historique de facturation. Union européenne.',
  },
  {
    name: 'Upstash',
    purpose: 'cache Redis',
    detail:
      'compteurs techniques servant à limiter le nombre de requêtes. Union européenne.',
  },
  {
    name: 'Vercel',
    purpose: "hébergement de l'application web et réseau de diffusion (CDN)",
    detail:
      'transit des requêtes et des pages affichées. Traitement possible aux États-Unis.',
  },
  {
    name: HOSTING_PROVIDERS.api.name,
    purpose: "hébergement du serveur d'API de traitement",
    detail:
      'réception de vos fichiers audio et orchestration de la transcription.',
  },
  {
    name: 'Modal',
    purpose: 'calcul informatique (GPU) pour la transcription',
    detail:
      "votre fichier audio est transmis à Modal Labs, Inc. uniquement pour calculer la partition. Le calcul peut être exécuté dans des centres de données situés hors de l'Union européenne, notamment aux États-Unis.",
  },
  {
    name: 'PostHog',
    purpose: "mesure d'audience, uniquement avec votre consentement",
    detail:
      "événements d'usage (inscription, transcription, abonnement, achat de crédits, export) rattachés à un identifiant technique. Hébergement possible aux États-Unis.",
  },
  {
    name: 'Sentry',
    purpose: 'suivi des erreurs et de la performance',
    detail:
      "informations techniques sur les erreurs (page concernée, navigateur, adresse IP possible) et, lorsqu'une erreur survient, enregistrement de la session en cours. Traitement possible aux États-Unis.",
  },
  {
    name: 'Cloudflare Turnstile',
    purpose:
      "protection contre les robots sur les formulaires d'inscription et de mot de passe oublié",
    detail:
      'adresse IP et signaux techniques de votre navigateur transmis à Cloudflare, Inc. Traitement possible aux États-Unis.',
  },
  {
    name: 'Google',
    purpose:
      'connexion avec Google (facultative) et polices de caractères des pages publiques',
    detail:
      "si vous choisissez la connexion avec Google, Google nous transmet votre adresse email, votre nom et votre photo de profil ; l'affichage des pages publiques charge des polices depuis les serveurs de Google, qui reçoivent alors votre adresse IP. Traitement possible aux États-Unis.",
  },
]

export function PrivacyContent() {
  return (
    <>
      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        1. Responsable du traitement
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        {LEGAL_IDENTITY.companyName}, {LEGAL_IDENTITY.legalForm}, SIRET{' '}
        {LEGAL_IDENTITY.siret}, {LEGAL_IDENTITY.headOfficeAddress}. Contact pour
        la protection des données : {LEGAL_IDENTITY.privacyEmail}.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        2. Données collectées
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notavex collecte les données suivantes :
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          <span className="text-foreground font-medium">Données de compte</span>{' '}
          : adresse email, nom, mot de passe (stocké sous forme hachée) ; en cas
          de connexion avec Google, photo de profil et identifiant du compte
          Google associé
        </li>
        <li>
          <span className="text-foreground font-medium">Fichiers audio</span> :
          transmis pour traitement uniquement, puis supprimés automatiquement
          (voir la section 4)
        </li>
        <li>
          <span className="text-foreground font-medium">
            Liens YouTube ou Spotify
          </span>{' '}
          : lorsque vous soumettez un lien, il est transmis à ces services par
          nos serveurs pour afficher un aperçu et récupérer le contenu à
          transcrire
        </li>
        <li>
          <span className="text-foreground font-medium">
            Partitions générées
          </span>{' '}
          : stockées dans votre espace personnel jusqu&apos;à suppression de
          votre compte
        </li>
        <li>
          <span className="text-foreground font-medium">
            Données de paiement
          </span>{' '}
          : gérées directement par Stripe ; Notavex ne stocke aucun numéro de
          carte bancaire. Nous conservons la trace de votre demande
          d&apos;exécution immédiate et de votre renonciation au droit de
          rétractation (date, heure, version des CGV)
        </li>
        <li>
          <span className="text-foreground font-medium">
            Données d&apos;usage
          </span>{' '}
          : logs de connexion, utilisation des crédits, préférences de
          l&apos;interface
        </li>
        <li>
          <span className="text-foreground font-medium">
            Données techniques
          </span>{' '}
          : adresse IP et informations sur votre navigateur, utilisées pour la
          sécurité du service (limitation du nombre de requêtes, protection
          contre les robots) et le suivi des erreurs
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        3. Finalités et bases légales
      </h2>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          Exécution du contrat (art. 6.1.b RGPD) : fourniture du service de
          transcription et gestion des paiements
        </li>
        <li>
          Intérêt légitime (art. 6.1.f RGPD) : sécurité du service, prévention
          de la fraude et des abus (Cloudflare Turnstile, limitation des
          requêtes), suivi des erreurs (Sentry), amélioration du produit
        </li>
        <li>
          Obligation légale (art. 6.1.c RGPD) : conservation des données de
          facturation
        </li>
        <li>
          Consentement (art. 6.1.a RGPD) : mesure d&apos;audience avec PostHog
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        4. Durée de conservation
      </h2>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          <span className="text-foreground font-medium">Données de compte</span>{' '}
          : pendant la durée active du compte, puis 3 ans après résiliation ou
          suppression
        </li>
        <li>
          <span className="text-foreground font-medium">
            Fichiers audio uploadés
          </span>{' '}
          : conservés temporairement sur notre serveur de traitement, le temps
          du traitement et de la mise à disposition du résultat (24 heures par
          défaut), puis supprimés automatiquement
        </li>
        <li>
          <span className="text-foreground font-medium">
            Données de facturation
          </span>{' '}
          : 10 ans conformément aux obligations comptables légales
        </li>
        <li>
          <span className="text-foreground font-medium">Logs de connexion</span>{' '}
          : 12 mois
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        5. Sous-traitants et destinataires
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notavex fait appel aux prestataires suivants pour fournir le service.
        Chacun n&apos;intervient que pour la finalité indiquée :
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        {PROCESSORS.map((processor) => (
          <li key={processor.name}>
            <span className="text-foreground font-medium">
              {processor.name}
            </span>{' '}
            ({processor.purpose}) — {processor.detail}
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        6. Transferts hors Union européenne
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Plusieurs de nos prestataires (Stripe, Resend, Vercel, Modal, PostHog,
        Sentry, Cloudflare, Google) sont établis aux États-Unis ou peuvent
        traiter des données en dehors de l&apos;Union européenne. C&apos;est en
        particulier le cas de vos fichiers audio, dont le calcul peut être
        exécuté par Modal hors de l&apos;Union européenne.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Ces transferts reposent, selon le prestataire, sur la décision
        d&apos;adéquation relative au cadre de protection des données
        UE–États-Unis (Data Privacy Framework, art. 45 RGPD) lorsque le
        prestataire y est certifié, ou sur les clauses contractuelles types de
        la Commission européenne (art. 46 RGPD). Pour obtenir des précisions sur
        les garanties applicables à un prestataire, contactez-nous à{' '}
        {LEGAL_IDENTITY.privacyEmail}.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        7. Vos droits
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Conformément au RGPD, vous disposez des droits suivants :
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>Droit d&apos;accès à vos données personnelles</li>
        <li>Droit de rectification des données inexactes</li>
        <li>Droit à l&apos;effacement (« droit à l&apos;oubli »)</li>
        <li>
          Droit à la portabilité — export disponible depuis votre espace client
          (Paramètres → Exporter mes données)
        </li>
        <li>Droit d&apos;opposition au traitement</li>
        <li>Droit à la limitation du traitement</li>
        <li>
          Droit de retirer votre consentement à tout moment (voir la politique
          de cookies)
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Pour exercer ces droits, contactez-nous à {LEGAL_IDENTITY.privacyEmail}.
        En cas de réclamation non résolue, vous pouvez saisir la CNIL
        (Commission Nationale de l&apos;Informatique et des Libertés) sur
        www.cnil.fr.
      </p>
    </>
  )
}
