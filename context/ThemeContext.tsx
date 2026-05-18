import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme, type ThemeColors } from "@/constants/color";

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === "dark");

  useEffect(() => {
    if (systemScheme) {
      setIsDark(systemScheme === "dark");
    }
  }, [systemScheme]);

  const colors: ThemeColors = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => setIsDark((prev) => !prev);

  return { isDark, colors, toggleTheme };
});
