export function PrivacyContent() {
  return (
    <>
      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        1. Responsable du traitement
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notavex SAS, SIRET XXXXXXXXXXXXXXXXX, Paris, France. Contact délégué à
        la protection des données (DPO) : privacy@notavex.com.
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
          : adresse email, nom, mot de passe (stocké sous forme hachée)
        </li>
        <li>
          <span className="text-foreground font-medium">Fichiers audio</span> :
          uploadés pour traitement uniquement, supprimés automatiquement après
          génération de la partition
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
          carte bancaire
        </li>
        <li>
          <span className="text-foreground font-medium">
            Données d&apos;usage
          </span>{' '}
          : logs de connexion, utilisation des crédits, préférences de
          l&apos;interface
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        3. Finalités et bases légales
      </h2>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          Exécution du contrat (art. 6.1.b RGPD) : fourniture du service de
          transcription
        </li>
        <li>
          Intérêt légitime (art. 6.1.f RGPD) : sécurité du service, prévention
          de la fraude, amélioration du produit
        </li>
        <li>
          Obligation légale (art. 6.1.c RGPD) : conservation des données de
          facturation
        </li>
        <li>Consentement (art. 6.1.a RGPD) : cookies analytiques Vercel</li>
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
          : supprimés immédiatement après traitement
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
        5. Sous-traitants
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notavex fait appel aux sous-traitants suivants, chacun étant soumis à
        ses propres obligations RGPD :
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
        <li>
          <span className="text-foreground font-medium">Stripe</span> (paiement)
          — États-Unis, clauses contractuelles types
        </li>
        <li>
          <span className="text-foreground font-medium">Resend</span> (emails
          transactionnels) — États-Unis, clauses contractuelles types
        </li>
        <li>
          <span className="text-foreground font-medium">Neon DB</span> (base de
          données PostgreSQL) — Union européenne
        </li>
        <li>
          <span className="text-foreground font-medium">Upstash</span> (cache
          Redis) — Union européenne
        </li>
        <li>
          <span className="text-foreground font-medium">Vercel</span>{' '}
          (hébergement, CDN, analytics) — États-Unis, clauses contractuelles
          types
        </li>
        <li>
          <span className="text-foreground font-medium">Backend FastAPI</span>{' '}
          (traitement audio par IA) — infrastructure hébergée chez Vercel
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">
        6. Transferts hors Union européenne
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Certains de nos sous-traitants (Stripe, Vercel, Resend) peuvent traiter
        des données aux États-Unis. Ces transferts sont encadrés par des clauses
        contractuelles types (CCT) approuvées par la Commission européenne,
        conformément à l&apos;article 46 du RGPD.
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
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Pour exercer ces droits, contactez-nous à privacy@notavex.com. En cas de
        réclamation non résolue, vous pouvez saisir la CNIL (Commission
        Nationale de l&apos;Informatique et des Libertés) sur www.cnil.fr.
      </p>
    </>
  )
}
