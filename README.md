# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Variables d'environnement (.env)

Créez un fichier `.env` à la racine pour surcharger l'URL de l'API backend sans modifier le code :

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

Notes importantes :
- Les variables doivent commencer par `EXPO_PUBLIC_` pour être injectées côté client par Expo.
- Ne placez jamais de secrets (clé API privée, token admin) dans ces variables.
- Sur appareil physique, remplacez `localhost` par l'IP LAN de votre machine (ex: `http://10.25.132.43:3001`).
- Après modification du `.env`, redémarrez le serveur Expo pour prise en compte :
   ```bash
   npx expo start --clear
   ```

Un fichier `.env.example` est fourni pour référence.

## Session & Auth

La session (token) est maintenant persistée avec `AsyncStorage` :

- Stockage: le token est enregistré sous la clé `authToken`.
- Chargement initial: au démarrage (`app/_layout.tsx`), l'app charge le token avant d'afficher les écrans.
- Accès: utilisez `getTokenAsync()` si vous avez besoin du token après un rechargement fraîchement effectué.
- Nettoyage: appelez `clearToken()` pour déconnecter l'utilisateur.

Après modification du code de session, si le token ne semble pas persister, forcez un redémarrage:
```bash
npx expo start --clear
```

Pour sécuriser davantage (ex: en production), remplacez `AsyncStorage` par `expo-secure-store`.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
