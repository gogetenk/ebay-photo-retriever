# Configuration API eBay - Récupération d'images

## Solution finale : API Browse avec Application Token

**Vous aviez raison !** Pour un script one-shot récupérant des données publiques d'annonces eBay, l'authentification applicative est plus appropriée.

### 🎯 **Pourquoi Browse API ?**

- ✅ **Application Token** (client_credentials) - pas besoin d'autorisation utilisateur
- ✅ **Données publiques** - conçue pour récupérer des infos d'items publics
- ✅ **API moderne** - REST/JSON vs XML obsolète
- ✅ **Plus simple** - authentification automatique

### 🔄 **Migration effectuée**

**AVANT** (Trading API + User Token) :
```typescript
// Nécessitait un User OAuth Token
// Format XML complexe
// Parsing manuel des <PictureDetails>
```

**APRÈS** (Browse API + Application Token) :
```typescript
// Application Token automatique via client_credentials
const response = await axios.get(`${BROWSE_API_ENDPOINT}/${itemId}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR'
  }
});

// JSON moderne avec champs dédiés
const images = [];
if (itemData.image?.imageUrl) images.push(itemData.image.imageUrl);
if (itemData.additionalImages) {
  itemData.additionalImages.forEach(img => images.push(img.imageUrl));
}
```

## Configuration requise

### 1. Credentials eBay

Vous avez besoin de vos **App credentials** (pas de User Token) :

1. Allez sur [eBay Developer Portal](https://developer.ebay.com/)
2. Dans votre application, récupérez :
   - **Client ID** (App ID)
   - **Client Secret**
3. Le script génère automatiquement l'Application Token

### 2. Variables d'environnement

Créez un fichier `.env.local` :

```env
EBAY_CLIENT_ID=votre_client_id_ici
EBAY_CLIENT_SECRET=votre_client_secret_ici
EBAY_SANDBOX=false
```

## Test du script

1. Configurez vos **Client ID** et **Client Secret**
2. Testez avec un Item ID eBay France existant
3. Vérifiez les logs dans la console du navigateur
4. Les images devraient maintenant apparaître dans le payload JSON

## Debugging

Le script inclut maintenant des logs détaillés :
- Réponse JSON complète de l'API Browse
- Génération automatique du token d'application
- Nombre d'images trouvées par item
- Gestion d'erreurs spécifiques (404, 400, etc.)

## Avantages de cette solution

### ✅ **Authentification simplifiée**
- Pas besoin d'autorisation utilisateur
- Token généré automatiquement
- Adapté aux scripts one-shot

### ✅ **API moderne**
- Format JSON vs XML
- Champs dédiés pour les images
- Meilleure performance

### ✅ **Maintenance réduite**
- Pas de gestion de tokens utilisateur
- API stable et supportée

## Ressources

- [eBay Browse API](https://developer.ebay.com/api-docs/buy/browse/overview.html)
- [Client Credentials Flow](https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html)
- [getItem Browse API](https://developer.ebay.com/api-docs/buy/browse/resources/item/methods/getItem)
