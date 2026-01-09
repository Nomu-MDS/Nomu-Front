# 🪙 Intégration du Système de Tokens - Guide Frontend

Ce guide explique comment intégrer le système de tokens dans votre application frontend.

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration initiale](#configuration-initiale)
3. [Routes disponibles](#routes-disponibles)
4. [Exemples d'intégration](#exemples-dintégration)
5. [Gestion d'état](#gestion-détat)
6. [Composants suggérés](#composants-suggérés)
7. [Cas d'usage](#cas-dusage)

---

## Vue d'ensemble

Le système de tokens permet de :
- **Consulter** le solde de tokens d'un utilisateur
- **Afficher** l'historique des transactions
- **Gérer** les crédits/débits (pour les admins)
- **Bloquer** les actions quand le solde est insuffisant

**Base URL:** `http://localhost:3001` (développement)

---

## Configuration initiale

### 1. Récupérer le token Firebase après login

Lors de la connexion, vous recevez un `idToken` :

```javascript
// Exemple de réponse après login
{
  "idToken": "eyJhbGci...",
  "refreshToken": "AMf-vBz...",
  "email": "user@example.com"
}
```

### 2. Stocker le token

```javascript
// Dans votre state management (Redux, Context, etc.)
localStorage.setItem('firebaseToken', idToken);
```

### 3. Créer une fonction pour les appels API

```javascript
// utils/api.js
const API_BASE_URL = 'http://localhost:3001';

async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('firebaseToken');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Une erreur est survenue');
  }

  return response.json();
}

export default fetchWithAuth;
```

---

## Routes disponibles

### 🔍 1. Consulter le solde

**Endpoint:** `GET /tokens/balance`

**Usage:** Afficher le solde dans le header/navbar

```javascript
// services/tokenService.js
import fetchWithAuth from '../utils/api';

export async function getBalance() {
  return await fetchWithAuth('/tokens/balance');
}
```

**Réponse:**
```json
{
  "balance": 100
}
```

**Exemple d'utilisation (React):**
```jsx
import { useEffect, useState } from 'react';
import { getBalance } from './services/tokenService';

function TokenBadge() {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    async function loadBalance() {
      try {
        const data = await getBalance();
        setBalance(data.balance);
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
    loadBalance();
  }, []);

  return (
    <div className="token-badge">
      🪙 {balance ?? '...'} tokens
    </div>
  );
}
```

---

### 📊 2. Détails du wallet

**Endpoint:** `GET /tokens/wallet`

**Usage:** Page "Mon Wallet" avec statistiques

```javascript
export async function getWalletDetails() {
  return await fetchWithAuth('/tokens/wallet');
}
```

**Réponse:**
```json
{
  "wallet": {
    "id": 2,
    "user_id": 17,
    "balance": 70,
    "createdAt": "2026-01-08T11:28:05.886Z",
    "updatedAt": "2026-01-08T12:09:53.967Z",
    "User": {
      "id": 17,
      "name": "Test Token",
      "email": "testtoken@example.com",
      "role": "user"
    }
  },
  "statistics": {
    "total_credits": 100,
    "total_debits": 30,
    "transaction_count": 2
  }
}
```

**Exemple (React):**
```jsx
function WalletPage() {
  const [walletData, setWalletData] = useState(null);

  useEffect(() => {
    async function loadWallet() {
      const data = await getWalletDetails();
      setWalletData(data);
    }
    loadWallet();
  }, []);

  if (!walletData) return <div>Chargement...</div>;

  return (
    <div className="wallet-page">
      <h1>Mon Wallet</h1>
      <div className="balance">
        <h2>Solde actuel</h2>
        <p>{walletData.wallet.balance} tokens</p>
      </div>

      <div className="statistics">
        <h3>Statistiques</h3>
        <p>Total crédits: +{walletData.statistics.total_credits}</p>
        <p>Total débits: -{walletData.statistics.total_debits}</p>
        <p>Nombre de transactions: {walletData.statistics.transaction_count}</p>
      </div>
    </div>
  );
}
```

---

### 📜 3. Historique des transactions

**Endpoint:** `GET /tokens/history?limit=50&offset=0&type=MESSAGE_SENT`

**Paramètres:**
- `limit` (optionnel): Nombre de transactions (défaut: 50)
- `offset` (optionnel): Pagination (défaut: 0)
- `type` (optionnel): Filtrer par type de transaction

```javascript
export async function getHistory(params = {}) {
  const { limit = 50, offset = 0, type } = params;

  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    ...(type && { type }),
  });

  return await fetchWithAuth(`/tokens/history?${queryParams}`);
}
```

**Réponse:**
```json
{
  "transactions": [
    {
      "id": 2,
      "user_id": 17,
      "amount": -30,
      "type": "MESSAGE_SENT",
      "reason": "Envoi d'un message",
      "metadata": { "messageId": 123 },
      "balance_before": 100,
      "balance_after": 70,
      "createdAt": "2026-01-08T12:09:53.967Z"
    },
    {
      "id": 1,
      "user_id": 17,
      "amount": 100,
      "type": "SIGNUP_BONUS",
      "reason": "Bonus de bienvenue",
      "metadata": null,
      "balance_before": 0,
      "balance_after": 100,
      "createdAt": "2026-01-08T12:08:34.881Z"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

**Exemple (React avec pagination):**
```jsx
function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    async function loadHistory() {
      const data = await getHistory({ limit, offset: page * limit });
      setTransactions(data.transactions);
      setTotal(data.total);
    }
    loadHistory();
  }, [page]);

  return (
    <div className="transaction-history">
      <h2>Historique des transactions</h2>

      <ul>
        {transactions.map((tx) => (
          <li key={tx.id} className={tx.amount > 0 ? 'credit' : 'debit'}>
            <span className="amount">
              {tx.amount > 0 ? '+' : ''}{tx.amount} tokens
            </span>
            <span className="type">{tx.type}</span>
            <span className="reason">{tx.reason}</span>
            <span className="date">
              {new Date(tx.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>

      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Précédent
        </button>
        <span>Page {page + 1}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={(page + 1) * limit >= total}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
```

---

### ➕ 4. Créditer des tokens (Admin uniquement)

**Endpoint:** `POST /tokens/credit`

**Body:**
```json
{
  "userId": 17,
  "amount": 100,
  "type": "SIGNUP_BONUS",
  "reason": "Bonus de bienvenue",
  "metadata": { "campaign": "launch-2026" }
}
```

**Types de crédit disponibles:**
- `SIGNUP_BONUS`
- `RESERVATION_COMPLETED`
- `REFERRAL_BONUS`
- `DAILY_LOGIN`
- `PROFILE_COMPLETED`
- `ADMIN_ADJUSTMENT`
- `REFUND`

```javascript
export async function creditTokens(userId, amount, type, reason, metadata = null) {
  return await fetchWithAuth('/tokens/credit', {
    method: 'POST',
    body: JSON.stringify({ userId, amount, type, reason, metadata }),
  });
}
```

**Exemple (Panel Admin):**
```jsx
function AdminTokenCredit({ userId }) {
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');

  async function handleCredit() {
    try {
      await creditTokens(userId, amount, 'ADMIN_ADJUSTMENT', reason);
      alert('Tokens crédités avec succès !');
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  }

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        placeholder="Montant"
      />
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Raison"
      />
      <button onClick={handleCredit}>Créditer</button>
    </div>
  );
}
```

---

### ➖ 5. Débiter des tokens

**Endpoint:** `POST /tokens/debit`

**Body:**
```json
{
  "userId": 17,
  "amount": 10,
  "type": "MESSAGE_SENT",
  "reason": "Envoi d'un message",
  "metadata": { "messageId": 123, "conversationId": 45 }
}
```

**Types de débit disponibles:**
- `MESSAGE_SENT`
- `RESERVATION_CREATED`
- `PROFILE_BOOST`
- `UNLOCK_CONTACT`
- `ADMIN_ADJUSTMENT`

```javascript
export async function debitTokens(userId, amount, type, reason, metadata = null) {
  return await fetchWithAuth('/tokens/debit', {
    method: 'POST',
    body: JSON.stringify({ userId, amount, type, reason, metadata }),
  });
}
```

**⚠️ Gestion du solde insuffisant (Erreur 402):**

```javascript
async function sendMessage(messageContent) {
  try {
    // 1. Débiter les tokens
    await debitTokens(currentUserId, 10, 'MESSAGE_SENT', 'Envoi message');

    // 2. Envoyer le message
    await sendMessageAPI(messageContent);

    alert('Message envoyé !');
  } catch (error) {
    if (error.message.includes('Solde insuffisant')) {
      alert('⚠️ Vous n\'avez pas assez de tokens pour envoyer ce message.');
      // Rediriger vers la page d'achat de tokens
    } else {
      alert(`Erreur: ${error.message}`);
    }
  }
}
```

---

## Gestion d'état

### Exemple avec React Context

```jsx
// contexts/TokenContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getBalance } from '../services/tokenService';

const TokenContext = createContext();

export function TokenProvider({ children }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  async function refreshBalance() {
    try {
      const data = await getBalance();
      setBalance(data.balance);
    } catch (error) {
      console.error('Erreur refresh balance:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshBalance();
  }, []);

  return (
    <TokenContext.Provider value={{ balance, refreshBalance, loading }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useTokens() {
  return useContext(TokenContext);
}
```

**Utilisation:**
```jsx
import { useTokens } from './contexts/TokenContext';

function MyComponent() {
  const { balance, refreshBalance } = useTokens();

  async function handleAction() {
    // Faire une action qui modifie le solde
    await debitTokens(...);

    // Rafraîchir le solde
    await refreshBalance();
  }

  return <div>Solde: {balance} tokens</div>;
}
```

---

## Composants suggérés

### 1. Badge de solde (Navbar)

```jsx
// components/TokenBadge.jsx
import { useTokens } from '../contexts/TokenContext';

export function TokenBadge() {
  const { balance, loading } = useTokens();

  if (loading) return <div>...</div>;

  return (
    <div className="token-badge">
      <span className="icon">🪙</span>
      <span className="balance">{balance}</span>
    </div>
  );
}
```

### 2. Bouton avec vérification de solde

```jsx
// components/TokenActionButton.jsx
import { useTokens } from '../contexts/TokenContext';

export function TokenActionButton({ cost, onAction, children }) {
  const { balance } = useTokens();
  const canAfford = balance >= cost;

  return (
    <button
      onClick={onAction}
      disabled={!canAfford}
      className={canAfford ? '' : 'insufficient-tokens'}
    >
      {children}
      {!canAfford && <span>⚠️ Solde insuffisant</span>}
    </button>
  );
}
```

**Utilisation:**
```jsx
<TokenActionButton
  cost={10}
  onAction={handleSendMessage}
>
  Envoyer le message (10 tokens)
</TokenActionButton>
```

### 3. Modal de solde insuffisant

```jsx
// components/InsufficientTokensModal.jsx
export function InsufficientTokensModal({ isOpen, onClose, required, current }) {
  if (!isOpen) return null;

  return (
    <div className="modal">
      <h2>⚠️ Solde insuffisant</h2>
      <p>Vous avez besoin de {required} tokens.</p>
      <p>Solde actuel: {current} tokens</p>
      <p>Il vous manque: {required - current} tokens</p>

      <div className="actions">
        <button onClick={() => window.location.href = '/acheter-tokens'}>
          Acheter des tokens
        </button>
        <button onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}
```

---

## Cas d'usage

### 1. Envoyer un message (10 tokens)

```javascript
async function sendMessage(conversationId, content) {
  try {
    // Débiter les tokens
    await debitTokens(
      currentUserId,
      10,
      'MESSAGE_SENT',
      'Envoi d\'un message',
      { conversationId }
    );

    // Envoyer le message via WebSocket ou API
    socket.emit('send_message', { conversationId, content });

    // Rafraîchir le solde
    await refreshBalance();

  } catch (error) {
    if (error.message.includes('Solde insuffisant')) {
      showInsufficientTokensModal(10);
    }
  }
}
```

### 2. Créer une réservation (50 tokens)

```javascript
async function createReservation(reservationData) {
  try {
    // Débiter les tokens
    await debitTokens(
      currentUserId,
      50,
      'RESERVATION_CREATED',
      'Création d\'une réservation',
      { title: reservationData.title }
    );

    // Créer la réservation
    const response = await fetch('/reservations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reservationData),
    });

    await refreshBalance();

  } catch (error) {
    if (error.message.includes('Solde insuffisant')) {
      showInsufficientTokensModal(50);
    }
  }
}
```

### 3. Bonus de connexion quotidienne

```javascript
// Appeler au premier chargement de l'app
async function checkDailyLoginBonus() {
  const lastLogin = localStorage.getItem('lastLogin');
  const today = new Date().toDateString();

  if (lastLogin !== today) {
    try {
      await creditTokens(
        currentUserId,
        5,
        'DAILY_LOGIN',
        'Bonus de connexion quotidienne'
      );

      localStorage.setItem('lastLogin', today);
      showNotification('🎉 +5 tokens de bonus quotidien !');
      await refreshBalance();

    } catch (error) {
      console.error('Erreur bonus quotidien:', error);
    }
  }
}
```

### 4. Vérifier le solde avant une action

```javascript
import { useTokens } from '../contexts/TokenContext';

function MessageForm() {
  const { balance } = useTokens();
  const MESSAGE_COST = 10;

  function handleSubmit(e) {
    e.preventDefault();

    if (balance < MESSAGE_COST) {
      alert('Vous n\'avez pas assez de tokens pour envoyer ce message.');
      return;
    }

    // Continuer l'envoi
    sendMessage(messageContent);
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea placeholder="Votre message..." />
      <button type="submit" disabled={balance < MESSAGE_COST}>
        Envoyer ({MESSAGE_COST} tokens)
      </button>
      {balance < MESSAGE_COST && (
        <p className="warning">Solde insuffisant</p>
      )}
    </form>
  );
}
```

---

## 📌 Points importants

1. **Toujours rafraîchir le solde** après une action qui modifie les tokens
2. **Gérer l'erreur 402** (Payment Required) pour afficher un message approprié
3. **Vérifier le solde côté client** pour améliorer l'UX (mais la vérification côté serveur reste obligatoire)
4. **Afficher le solde** de manière visible (navbar, header)
5. **Logger les erreurs** pour faciliter le debug

---

## 🔒 Sécurité

- ✅ Toutes les routes nécessitent l'authentification Firebase
- ✅ Le solde ne peut jamais être négatif (validation serveur)
- ✅ Les transactions sont immuables
- ⚠️ Les routes admin (credit/debit) sont actuellement accessibles à tous les utilisateurs authentifiés
  - **TODO:** Ajouter un middleware admin pour sécuriser ces routes en production

---

## 📞 Support

Pour toute question sur l'intégration, référez-vous à :
- [API Documentation](./README.md)
- [Token System Tests](./TOKENS_API_EXAMPLES.md)
