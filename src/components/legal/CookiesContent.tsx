import { LEGAL_IDENTITY } from '@/lib/legal-identity'

export function CookiesContent() {
  return (
    <>
      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        1. Cookies et stockage local
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Un cookie est un petit fichier texte déposé sur votre appareil
        (ordinateur, smartphone, tablette) lors de votre visite sur un site web.
        Le stockage local du navigateur (localStorage, sessionStorage) joue un
        rôle comparable : il permet au site de mémoriser des informations sur
        votre visite, comme vos préférences ou votre état de connexion. Cette
        page décrit les deux.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        2. Cookies strictement nécessaires
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Ces cookies sont indispensables au fonctionnement ou à la sécurité du
        service. Ils ne nécessitent pas votre consentement conformément à
        l&apos;article 82 de la loi Informatique et Libertés.
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          <span className="text-foreground font-medium">
            Cookie de session (Auth.js / NextAuth)
          </span>{' '}
          — Maintient votre état d&apos;authentification une fois connecté.
          Durée : 30 jours maximum.
        </li>
        <li>
          <span className="text-foreground font-medium">
            Cookies techniques de connexion (Auth.js)
          </span>{' '}
          — Protection contre les requêtes forgées (CSRF), mémorisation de la
          page de retour et échanges avec Google si vous choisissez la connexion
          avec Google. Durée : courte, limitée à la connexion.
        </li>
        <li>
          <span className="text-foreground font-medium">
            Cloudflare Turnstile
          </span>{' '}
          — Contrôle anti-robots chargé uniquement sur les formulaires
          d&apos;inscription et de mot de passe oublié. Cloudflare peut lire ou
          écrire des informations sur votre appareil pour distinguer un humain
          d&apos;un robot.
        </li>
        <li>
          <span className="text-foreground font-medium">
            Votre choix de cookies (localStorage, clé cookie_consent)
          </span>{' '}
          — Mémorise si vous avez accepté ou refusé la mesure d&apos;audience,
          et la date de ce choix.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        3. Cookies de fonctionnement et de confort
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Ces traceurs servent uniquement à faire fonctionner ou à personnaliser
        l&apos;interface. Aucun n&apos;est utilisé pour de la publicité ni
        transmis à un tiers.
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          <span className="text-foreground font-medium">NEXT_LOCALE</span> —
          Mémorise la langue du site. Durée : session du navigateur.
        </li>
        <li>
          <span className="text-foreground font-medium">theme</span>{' '}
          (localStorage) — Mémorise votre thème clair ou sombre.
        </li>
        <li>
          <span className="text-foreground font-medium">nv_visited</span> —
          Indique qu&apos;un compte a déjà été connecté depuis ce navigateur,
          pour proposer la connexion plutôt que l&apos;inscription. Durée : 12
          mois.
        </li>
        <li>
          <span className="text-foreground font-medium">sidebar_state</span> —
          Mémorise l&apos;état ouvert ou fermé du menu latéral du tableau de
          bord. Durée : 7 jours.
        </li>
        <li>
          <span className="text-foreground font-medium">
            transcription_job_id
          </span>{' '}
          (localStorage) — Permet de retrouver une transcription en cours après
          un rechargement de page. Durée : 1 heure.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        4. Mesure d&apos;audience (avec votre consentement)
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notavex utilise PostHog pour comprendre comment le service est utilisé.
        Tant que vous n&apos;avez pas cliqué sur « Tout accepter » dans le
        bandeau, PostHog n&apos;enregistre aucun événement. Si vous refusez, ou
        si vous ne répondez pas, la mesure d&apos;audience reste désactivée.
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          <span className="text-foreground font-medium">PostHog</span> — Après
          votre accord, PostHog utilise un cookie et le stockage local de votre
          navigateur pour reconnaître votre appareil. Durée : 12 mois. Nous
          n&apos;activons ni la capture automatique des clics ni le suivi
          automatique des pages : seuls quelques événements précis sont envoyés
          (inscription, transcription, abonnement, achat de crédits, export, fin
          du parcours de découverte). Données possiblement hébergées aux
          États-Unis.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        5. Suivi des erreurs
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notavex utilise Sentry pour détecter et corriger les erreurs techniques.
        Sentry n&apos;est pas soumis au bandeau de cookies : il n&apos;utilise
        pas de cookie de suivi, mais peut transmettre des informations
        techniques sur l&apos;erreur (page, navigateur, adresse IP) et,
        lorsqu&apos;une erreur survient, un enregistrement de la session en
        cours. Aucune finalité publicitaire n&apos;est poursuivie.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        6. Services tiers
      </h2>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          <span className="text-foreground font-medium">Stripe</span> — Lors du
          paiement, vous quittez Notavex pour la page sécurisée de Stripe, qui
          dépose ses propres cookies de sécurité et de prévention de la fraude.
        </li>
        <li>
          <span className="text-foreground font-medium">Google</span> — Si vous
          choisissez la connexion avec Google, vous êtes redirigé vers Google,
          qui applique sa propre politique de cookies. Les pages publiques
          chargent par ailleurs des polices de caractères depuis les serveurs de
          Google.
        </li>
      </ul>

      <h2
        id="gestion"
        className="text-xl font-semibold mt-8 mb-4 text-foreground"
      >
        7. Gérer vos préférences cookies
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Vous pouvez modifier vos préférences à tout moment :
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          Le bandeau de consentement s&apos;affiche tant que vous n&apos;avez
          pas fait de choix. Votre choix est mémorisé dans le stockage local de
          votre navigateur, sans date d&apos;expiration automatique. Pour le
          modifier, effacez les données du site dans votre navigateur : le
          bandeau réapparaîtra à la prochaine visite.
        </li>
        <li>
          Via les paramètres de votre navigateur : la plupart des navigateurs
          permettent de bloquer ou de supprimer les cookies dans leurs
          paramètres de confidentialité. Le refus de la mesure d&apos;audience
          n&apos;affecte pas les fonctionnalités principales du service.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        8. Contact
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Pour toute question relative à notre politique de cookies,
        contactez-nous à {LEGAL_IDENTITY.privacyEmail}.
      </p>
    </>
  )
}
