import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parkingsaas.app',
  appName: 'ParkingSaaS',
  webDir: 'dist',
  plugins: {
    CapacitorThermalPrinter: {
      // PT-210 exposes a 48 mm effective print area on 58 mm paper.
      paperWidthMm: 48,
    },
  },
};

export default config;
