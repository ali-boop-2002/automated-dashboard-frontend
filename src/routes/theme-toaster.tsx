import { Toaster } from "sonner";
import { useTheme } from "@/contexts/theme-context";

export function ThemeAwareToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-right" theme={theme} />;
}
