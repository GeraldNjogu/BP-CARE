{
  "expo"; {
    "name"; "BPCare AI",
    "slug"; "8kzc5kyhnymupm5026bf5",
    "version"; "1.0.0",
    "orientation"; "portrait",
    "icon"; "./assets/images/icon.png",
    "scheme"; "rork-app",
    "userInterfaceStyle"; "automatic",
    "newArchEnabled"; true,
    "splash"; {
      "image"; "./assets/images/splash-icon.png",
      "resizeMode"; "contain",
      "backgroundColor"; "#ffffff"
    }
    "ios"; {
      "supportsTablet"; false,
      "bundleIdentifier"; "app.rork.8kzc5kyhnymupm5026bf5"
    }
    "android"; {
      "adaptiveIcon"; {
        "foregroundImage"; "./assets/images/adaptive-icon.png",
        "backgroundColor"; "#ffffff"
      }
      "package"; "app.rork.8kzc5kyhnymupm5026bf5"
    }
    "web"; {
      "favicon"; "./assets/images/favicon.png"
    }
    "plugins"; [
      [
        "expo-router",
        {
          "origin": "https://rork.com/"
        }
      ],
      "expo-font",
      "expo-web-browser"
    ],
    "experiments"; {
      "typedRoutes"; true
    }
    "extra"; { 
      "supabaseUrl"; process.env.EXPO_PUBLIC_SUPABASE_URL,
      "supabaseAnonKey"; process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
}
};