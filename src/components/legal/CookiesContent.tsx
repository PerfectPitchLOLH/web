export function CookiesContent() {
  return (
    <>
      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        1. Qu&apos;est-ce qu&apos;un cookie ?
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Un cookie est un petit fichier texte déposé sur votre appareil
        (ordinateur, smartphone, tablette) lors de votre visite sur un site web.
        Il permet au site de mémoriser des informations sur votre visite, comme
        vos préférences ou votre état de connexion.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        2. Cookies strictement nécessaires
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Ces cookies sont indispensables au fonctionnement du service. Ils ne
        nécessitent pas votre consentement conformément à l&apos;article 82 de
        la loi Informatique et Libertés.
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          <span className="text-foreground font-medium">
            Cookie de session JWT (NextAuth)
          </span>{' '}
          — Maintient votre état d&apos;authentification. Durée : session
          navigateur + token de rafraîchissement selon votre configuration.
          Nécessaire au fonctionnement du service.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        3. Cookies analytiques
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Ces cookies nous permettent de mesurer l&apos;audience de notre service
        et d&apos;améliorer l&apos;expérience utilisateur. Ils nécessitent votre
        consentement préalable.
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          <span className="text-foreground font-medium">
            Vercel Analytics / Vercel Insights
          </span>{' '}
          — Mesure d&apos;audience anonymisée : pages visitées, durée de
          session, source du trafic. Aucune donnée personnelle identifiable
          n&apos;est collectée. Durée : 30 jours maximum. Opéré par Vercel Inc.
          (États-Unis).
        </li>
      </ul>

      <h2
        id="gestion"
        className="text-xl font-semibold mt-8 mb-4 text-foreground"
      >
        4. Gérer vos préférences cookies
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Vous pouvez modifier vos préférences à tout moment :
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          Via notre bandeau de consentement qui s&apos;affiche lors de votre
          première visite. Si vous avez déjà fait un choix, rechargez la page en
          effaçant le stockage local de votre navigateur pour le faire
          réapparaître.
        </li>
        <li>
          Via les paramètres de votre navigateur : la plupart des navigateurs
          permettent de bloquer ou de supprimer les cookies dans leurs
          paramètres de confidentialité. Le refus des cookies analytiques
          n&apos;affecte pas les fonctionnalités principales du service.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        5. Durée de vie des cookies
      </h2>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>Cookies de session : supprimés à la fermeture du navigateur</li>
        <li>
          Cookies de persistance de session (NextAuth) : jusqu&apos;à 30 jours
        </li>
        <li>Cookies analytiques Vercel : 30 jours maximum</li>
        <li>Préférences de consentement (localStorage) : 12 mois</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        6. Contact
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Pour toute question relative à notre politique de cookies,
        contactez-nous à privacy@notavex.com.
      </p>
    </>
  )
}
