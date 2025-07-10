# Service de Paiement – RepAIr  -IBRAHIMI Yasmine

Ce service gère la **création de sessions de paiement par abonnement** via **Stripe**, ainsi que la **gestion des événements webhook** liés au paiement.  
Il permet d’activer des comptes premium sur RepAIr de façon automatisée et sécurisée.

---

## Fonctionnalités principales

-  Création de **sessions de paiement Stripe** (formulaire sécurisé)
-  Réception des **webhooks Stripe** pour détecter les paiements réussis
-  Mise à jour de l’abonnement de l’utilisateur dans le service DB
-  Exposition des **métriques Prometheus** (routes, méthodes, status)

---

##  Workflow général

1. Le client appelle `/api/payments/create-session` avec son **email** et **userId**.
2. Le service crée une **session Stripe** en mode abonnement.
3. L’utilisateur est redirigé vers Stripe pour effectuer son paiement.
4. Stripe envoie un **webhook** à `/api/webhook` quand le paiement est réussi.
5. Le service met à jour le statut premium de l’utilisateur dans le **DB service**.

---

## Technologies utilisées

- **Stripe** (via l’API officielle `stripe`)
- **Node.js + Express**
- **Axios** pour communiquer avec le service DB
- **Prometheus (prom-client)** pour la collecte des métriques

---

##  Routes exposées

### POST `/api/payments/create-session`

Crée une session Stripe.  
Reçoit :
```json
{
  "email": "user@example.com",
  "userId": "12345"
}
