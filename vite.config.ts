import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: [
        'date-fns',
        'next-themes',
        'recharts',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-slot',
        '@radix-ui/react-label',
        '@radix-ui/react-select',
        '@radix-ui/react-toast',
        '@radix-ui/react-popover',
        '@radix-ui/react-avatar',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-radio-group',
        '@radix-ui/react-tabs',
        '@radix-ui/react-separator',
        '@radix-ui/react-switch',
        '@radix-ui/react-accordion',
        '@radix-ui/react-navigation-menu',
        '@radix-ui/react-hover-card',
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-collapsible',
        '@radix-ui/react-context-menu',
        '@radix-ui/react-menubar',
        '@radix-ui/react-progress',
        '@radix-ui/react-scroll-area',
        '@radix-ui/react-slider',
        '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group',
        '@radix-ui/react-toolbar',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'lucide-react',
        'sonner',
        '@monaco-editor/react',
        'monaco-editor',
        'react-day-picker',
        'dayjs',
        'date-fns-tz'
      ],
    },
  },
  optimizeDeps: {
    include: [
      'date-fns',
      'next-themes',
      'recharts',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-slot',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-toast',
      '@radix-ui/react-popover',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-tabs',
      '@radix-ui/react-separator',
      '@radix-ui/react-switch',
      '@radix-ui/react-accordion',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-menubar',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-slider',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-toolbar',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'lucide-react',
      'sonner',
      '@monaco-editor/react',
      'monaco-editor',
      'react-day-picker',
      'dayjs',
      'date-fns-tz'
    ],
    exclude: ['monaco-editor']
  },
  define: {
    'process.env.NODE_DEBUG': false,
  },
}));
