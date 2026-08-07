import type {CapacitorConfig} from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.alexqfmm.mathgame",
  appName: "MathGame",
  webDir: "../web/dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
