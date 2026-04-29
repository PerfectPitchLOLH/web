# Roadmap Notavex

## Phase 0 — Bloquants lancement

- Pages légales (CGU, CGV, confidentialité, mentions légales)
- Cookie consent banner (RGPD)
- Email production (domaine custom + SPF/DKIM via Resend)
- Stripe live keys + tests end-to-end
- Sentry + error boundaries (`error.tsx`)
- Downgrade subscription

## Phase 1 — J1-J30

- Export PDF (MuseScore3 CLI → déjà dispo)
- Export MIDI (idem)
- Export Guitar Pro `.gp` (lib Python `guitarpro`)
- Chord symbols sur la partition
- BPM + tonalité auto-détectés (`librosa`)
- Détection signature rythmique
- Playback audio de la partition (Tone.js ou FluidSynth)
- **Confidence heatmap** — colorier les notes par niveau de confiance IA (unique sur le marché)
- **Lead sheet** — mélodie + accords + paroles comme type de sortie distinct (angle songwriter/jazz)
- **Genre hint à l'upload** — l'utilisateur précise genre/tonalité/tempo pour guider le modèle (aucun concurrent ne fait ça)
- Empty states + onboarding

## Phase 2 — M2-M3

- **Éditeur de partition interactif** (Verovio ou OpenSheetMusicDisplay) — cause #1 d'abandon : post-processing trop long
- **Practice mode** — ralentisseur sans changement de hauteur, boucles A/B, curseur synchronisé à l'audio (= rétention long terme)
- **Détection techniques guitare/basse** — bends, slides, hammer-on/pull-off, vibrato en tablature (aucun concurrent commercial)
- Transcription percussions (drum notation, Omnizart/ADTLib)
- Transposition en 1 clic
- Capo + accordages alternatifs (Drop D, Open G…)
- Traitement batch + téléchargement ZIP
- i18n EN/FR

## Phase 3 — M4-M6

- API publique avec clés (B2B, facturation par minute audio)
- Falling notes / piano roll animé (export vidéo → viralité TikTok)
- Collaboration temps réel (Yjs + WebSocket)
- "Polishing mode" — corriger un MIDI existant plutôt que cold-start
- Mobile PWA (offline score viewer)
- Programme de référence (crédits bonus)

## Phase 4 — 6M+

- Plugin DAW (VST/AU)
- OCR partitions papier (photo → MusicXML)
- Bibliothèque communautaire de transcriptions
- Modèles genre-specific (jazz, blues, classique)

---

## Avantages concurrentiels déjà en place (à mettre en avant dans le marketing)

- YouTube + Spotify input → Songscription vient de l'annoncer comme roadmap feature
- Stem separation intégrée (Demucs) → Music Demixer est le seul concurrent à combiner les deux, décrit comme "rough"

## Gap marché à viser

Soundslice = bon éditeur, pas d'IA. Songscription = bonne IA, pas d'éditeur. **Notavex = les deux.**
