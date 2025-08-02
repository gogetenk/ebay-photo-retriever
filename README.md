# eBay CSV Processor 🖼️

**Automatically retrieve eBay item images and update your CSV files**

*Récupérez automatiquement les images des articles eBay et mettez à jour vos fichiers CSV*

---

## 🌟 Features / Fonctionnalités

### English
- **Automatic image retrieval** from eBay listings using official eBay Browse API
- **Smart processing** - skips items that already have images
- **Real-time CSV updates** - saves progress immediately after each item
- **Backup protection** - automatic backup before any changes
- **Universal compatibility** - works with any eBay store worldwide
- **Progress tracking** - visual progress bar and detailed logs
- **Error handling** - robust error management with detailed feedback

### Français
- **Récupération automatique d'images** depuis les annonces eBay via l'API officielle eBay Browse
- **Traitement intelligent** - ignore les articles qui ont déjà des images
- **Mise à jour CSV en temps réel** - sauvegarde immédiate après chaque article
- **Protection par sauvegarde** - backup automatique avant toute modification
- **Compatibilité universelle** - fonctionne avec n'importe quelle boutique eBay mondiale
- **Suivi de progression** - barre de progression visuelle et logs détaillés
- **Gestion d'erreurs** - gestion robuste des erreurs avec feedback détaillé

---

## 🚀 Quick Start / Démarrage rapide

### 1. Prerequisites / Prérequis

- Node.js 18+ installed
- eBay Developer Account ([developer.ebay.com](https://developer.ebay.com/))
- Your eBay CSV export file

### 2. Installation

```bash
# Clone the repository / Clonez le dépôt
git clone <repository-url>
cd ebay-csv-processor

# Install dependencies / Installez les dépendances
npm install

# Copy environment template / Copiez le template d'environnement
cp .env.example .env.local
```

### 3. eBay API Configuration / Configuration API eBay

#### Get your eBay credentials / Obtenez vos identifiants eBay:

1. Go to [eBay Developer Portal](https://developer.ebay.com/)
2. Create an application or use existing one
3. Get your **Client ID** (App ID) and **Client Secret**
4. Update `.env.local`:

```env
EBAY_CLIENT_ID=your_client_id_here
EBAY_CLIENT_SECRET=your_client_secret_here
EBAY_SANDBOX=false
```

⚠️ **Important**: Use `EBAY_SANDBOX=true` for testing with sandbox credentials

### 4. Run the application / Lancez l'application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📝 How to Use / Comment utiliser

### English Instructions

1. **Export your eBay listings** to CSV from eBay Seller Hub
2. **Ensure your CSV has these columns**: `Item number`, `Picture1`, `Picture2`, `Picture3`
3. **Upload your CSV** by dragging & dropping or clicking "Select CSV"
4. **Review the statistics**: Total items, items with images, items to process
5. **Click "Start Processing"** to begin automatic image retrieval
6. **Monitor progress** in real-time with visual progress bar
7. **Download updated CSV** when processing is complete

### Instructions en Français

1. **Exportez vos annonces eBay** en CSV depuis eBay Seller Hub
2. **Assurez-vous que votre CSV a ces colonnes** : `Item number`, `Picture1`, `Picture2`, `Picture3`
3. **Téléchargez votre CSV** en glissant-déposant ou en cliquant "Sélectionner un CSV"
4. **Vérifiez les statistiques** : Total d'articles, articles avec images, articles à traiter
5. **Cliquez "Lancer la récupération"** pour commencer la récupération automatique d'images
6. **Surveillez la progression** en temps réel avec la barre de progression visuelle
7. **Téléchargez le CSV mis à jour** une fois le traitement terminé

---

## 🔧 CSV Format Requirements / Exigences du format CSV

### Required Columns / Colonnes requises:

```csv
Item number;Item url;Picture1;Picture2;Picture3;Title;...
354661249768;https://www.ebay.fr/itm/354661249768;;;;FRANCE MONACO EUROPA;...
```

- **Item number**: eBay item ID (supports scientific notation like `3,54624E+11`)
- **Picture1, Picture2, Picture3**: Will be populated with image URLs
- **Separator**: Semicolon (`;`) - standard eBay export format

### After Processing / Après traitement:

```csv
Item number;Picture1;Picture2;Picture3;Title;...
354661249768;https://i.ebayimg.com/.../pic1.jpg;https://i.ebayimg.com/.../pic2.jpg;https://i.ebayimg.com/.../pic3.jpg;FRANCE MONACO EUROPA;...
```

---

## 🌍 Multi-Marketplace Support / Support multi-marchés

This tool works with **any eBay marketplace worldwide**:

*Cet outil fonctionne avec **n'importe quel marché eBay mondial** :*

- 🇺🇸 eBay.com (US)
- 🇫🇷 eBay.fr (France) 
- 🇬🇧 eBay.co.uk (UK)
- 🇩🇪 eBay.de (Germany)
- 🇮🇹 eBay.it (Italy)
- 🇪🇸 eBay.es (Spain)
- 🇦🇺 eBay.com.au (Australia)
- And many more... / Et bien d'autres...

The marketplace is automatically detected from your item IDs.

*Le marché est automatiquement détecté à partir de vos ID d'articles.*

---

## ⚙️ Advanced Configuration / Configuration avancée

### Environment Variables / Variables d'environnement

```env
# eBay API Credentials / Identifiants API eBay
EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret

# Environment / Environnement
EBAY_SANDBOX=false  # Set to true for testing / Mettre à true pour les tests
```

### Processing Settings / Paramètres de traitement

- **Batch processing**: Items are processed one by one with 200ms delay
- **Rate limiting**: Built-in delays to respect eBay API limits
- **Error handling**: Failed items are logged but don't stop the process
- **Resume capability**: Restart processing anytime - completed items are skipped

*Traitement par lots* : Les articles sont traités un par un avec un délai de 200ms
*Limitation du taux* : Délais intégrés pour respecter les limites de l'API eBay
*Gestion d'erreurs* : Les articles échoués sont enregistrés mais n'arrêtent pas le processus
*Capacité de reprise* : Redémarrez le traitement à tout moment - les articles terminés sont ignorés

---

## 🛠️ Troubleshooting / Dépannage

### Common Issues / Problèmes courants

#### "Client authentication failed" / "Échec de l'authentification client"
- ✅ Check your `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET`
- ✅ Verify sandbox vs production settings
- ✅ Ensure credentials are from the correct eBay environment

#### "Item not found" / "Article non trouvé"
- ✅ Item may have expired or been removed from eBay
- ✅ Check if item ID format is correct
- ✅ Verify the item exists on the expected marketplace

#### CSV not updating / CSV ne se met pas à jour
- ✅ Check browser console for error messages
- ✅ Ensure write permissions on the CSV file
- ✅ Verify the CSV file path is correct

### Debug Mode / Mode débogage

Open browser console (F12) to see detailed logs:
- API requests and responses
- Image retrieval status
- CSV save confirmations
- Error details

*Ouvrez la console du navigateur (F12) pour voir les logs détaillés :*
- *Requêtes et réponses API*
- *Statut de récupération d'images*
- *Confirmations de sauvegarde CSV*
- *Détails des erreurs*

---

## 🔒 Security & Privacy / Sécurité et confidentialité

- **No data storage**: Your CSV data is processed locally and not stored on any server
- **Secure API calls**: All eBay API calls use official OAuth 2.0 authentication
- **Backup protection**: Automatic backup of your original CSV before any changes
- **Local processing**: All image processing happens on your machine

*Aucun stockage de données* : Vos données CSV sont traitées localement et ne sont stockées sur aucun serveur
*Appels API sécurisés* : Tous les appels API eBay utilisent l'authentification officielle OAuth 2.0
*Protection par sauvegarde* : Sauvegarde automatique de votre CSV original avant toute modification
*Traitement local* : Tout le traitement d'images se fait sur votre machine

---

## 📊 Performance / Performance

- **Processing speed**: ~200-300 items per hour (respects eBay rate limits)
- **Memory usage**: Minimal - processes one item at a time
- **Network usage**: Only downloads image URLs, not actual images
- **Storage**: Creates backup files (~same size as original CSV)

*Vitesse de traitement* : ~200-300 articles par heure (respecte les limites de taux eBay)
*Utilisation mémoire* : Minimale - traite un article à la fois
*Utilisation réseau* : Télécharge uniquement les URLs d'images, pas les images réelles
*Stockage* : Crée des fichiers de sauvegarde (~même taille que le CSV original)

---

## 🤝 Contributing / Contribuer

Contributions are welcome! Please feel free to submit a Pull Request.

*Les contributions sont les bienvenues ! N'hésitez pas à soumettre une Pull Request.*

### Development Setup / Configuration de développement

```bash
# Install dependencies / Installer les dépendances
npm install

# Run in development mode / Lancer en mode développement
npm run dev

# Build for production / Construire pour la production
npm run build
```

---

## 📄 License / Licence

MIT License - feel free to use this for any eBay store!

*Licence MIT - libre d'utilisation pour n'importe quelle boutique eBay !*

---

## 🆘 Support

If you encounter any issues or need help:

*Si vous rencontrez des problèmes ou avez besoin d'aide :*

1. Check the troubleshooting section above
2. Open browser console (F12) for detailed error logs
3. Create an issue on GitHub with:
   - Your error message
   - Browser console logs
   - CSV format example (without sensitive data)

---

**Made with ❤️ for eBay sellers worldwide**

*Fait avec ❤️ pour les vendeurs eBay du monde entier*
