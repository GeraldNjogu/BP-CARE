# BP Care

## Project Overview

BP Care is a cross-platform Expo mobile application for tracking blood pressure, heart rate, and wellness trends.

The app connects to BLE-enabled wearable devices, stores readings in Supabase, and displays historical charts, trending analytics, and health insights.

## Features

- Bluetooth LE watch pairing and measurement capture
- Manual vital entry for systolic, diastolic, and heart rate readings
- Supabase-backed storage of readings and history
- Analytics dashboard with the latest reading, risk category, and trend summary
- Historical charts and timeline feed for prior measurements
- Authentication support and persistent user data
- Notification handling and safe-area friendly layout

## Technology Stack

- Expo + Expo Router for app shell and routing
- React Native and TypeScript for cross-platform UI and logic
- Supabase for backend storage and authentication
- react-native-ble-plx for Bluetooth Low Energy device communication
- Lucide React Native for icons
- React Query for data fetching and state management
- react-native-safe-area-context for safe layout on modern devices

## Getting Started

### Prerequisites

- Node.js installed
- Bun installed (optional)
- Expo CLI available via `npx expo`

### Install dependencies

```bash
bun install
```

or if you prefer npm:

```bash
npm install
```

### Run the app

```bash
bun run start
```

or with npm:

```bash
npm run start
```

### Web preview

```bash
bun run start-web
```

### Development build for BLE and native features

For device testing and BLE support:

```bash
npx expo start --dev-client
```

## Testing the App

### On your phone

1. Install Expo Go from the App Store or Google Play.
2. Start the app server with:

```bash
bun run start
```

3. Scan the QR code from the Expo terminal.

### In your browser

```bash
bun run start-web
```

Note: Some native features such as BLE may not work in browser preview.

### Simulator or emulator

If you have Xcode or Android Studio installed:

```bash
npx expo start --ios
npx expo start --android
```

## Deployment

### Android

```bash
eas build --platform android
```

### iOS

```bash
eas build --platform ios
```

### Web (optional)

```bash
eas build --platform web
```

## Project Structure

```text
├── app/                    # App screens and Expo Router routes
│   ├── (auth)/             # Authentication screens
│   ├── (tabs)/             # Main tab navigation screens
│   ├── _layout.tsx         # Root layout
│   ├── modal.tsx           # Modal screen example
│   └── +not-found.tsx      # Not found screen
├── assets/                 # Static assets and images
├── components/             # Reusable UI components
├── constants/              # App constants and theme values
├── context/                # React context providers
├── services/               # API, BLE, and Supabase logic
├── supabase/               # Database schema and SQL files
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── babel.config.js         # Babel configuration for Expo
```

## Notes

- The app uses Supabase for authenticated data storage and history syncing.
- BLE state and measurement flow are managed in `context/BLEContext.ts`.
- Historical trend charts are rendered in `app/(tabs)/charts.tsx`.
- Manual readings are filtered and validated before persistence.

## Troubleshooting

### App not loading on device?

1. Make sure your phone and computer are on the same network.
2. Use tunnel mode if needed:

```bash
bun run start -- --tunnel
```

3. Confirm the Expo terminal is running and scan the QR code again.

### Build failing?

1. Clear the Expo cache:

```bash
npx expo start --clear
```

2. Delete and reinstall dependencies:

```bash
rm -rf node_modules
bun install
```

3. Review Expo error output and the [Expo troubleshooting guide](https://docs.expo.dev/troubleshooting/build-errors/).

### Need help with native features?

- Check [Expo's documentation](https://docs.expo.dev/) for native APIs.
- Browse [React Native's documentation](https://reactnative.dev/docs/getting-started) for core components.

## Contributing

If you want to contribute or extend BP Care:

- Add new screens under `app/`
- Add reusable components under `components/`
- Place shared logic in `context/` and `services/`
- Keep TypeScript definitions consistent with `context/BLEContext.ts`
- Use `bun run lint` or `npm run lint` to validate code quality

## License

This repository is available for your own development and customization.
