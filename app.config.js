const fs = require('fs');
const path = require('path');

let envFallback = {};
try {
  // Check workspace root first, then fall back to directory name root
  const pathsToTry = [
    path.join(process.cwd(), '.env'),
    path.resolve(__dirname, '.env')
  ];

  let envPath = null;
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      envPath = p;
      break;
    }
  }

  if (envPath) {
    console.log("Found .env file automatically at:", envPath);
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
      // Ignore comments and empty lines
      if (!line || line.startsWith('#')) return;
      
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        envFallback[key.trim()] = valueParts.join('=').trim();
      }
    });
  } else {
    console.log("❌ CRITICAL: app.config.js could not locate a .env file anywhere in your root directory.");
  }
} catch (e) {
  console.log("Error reading .env file:", e.message);
}

module.exports = {
  expo: {
    name: "BPCare AI",
    slug: "8kzc5kyhnymupm5026bf5",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rork-app",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "app.rork.rork8kzc5kyhnymupm5026bf5"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "app.rork.rork8kzc5kyhnymupm5026bf5"
    },
    web: {
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://rork.com/"
        }
      ],
      "expo-image",
      "expo-font",
      "expo-web-browser",
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 36,
            "targetSdkVersion": 35,
            "buildToolsVersion": "35.0.0"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
  }
};
