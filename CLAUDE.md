# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Red Sea tourism landing page** built with Next.js 16 (App Router). The site is primarily **Arabic with RTL (right-to-left) support** and uses custom Arabic typography.

**Tech Stack:**
- Next.js 16 (App Router)
- TypeScript (strict mode)
- Tailwind CSS v4
- shadcn/ui components (New York style, RTL-enabled)
- Framer Motion for animations
- Embla Carousel for sliders
- Lucide React for icons
- pnpm as package manager

## Development Commands

```bash
# Start development server (localhost:3000)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Add shadcn/ui components
pnpm dlx shadcn@latest add [component-name]
```

## Project Structure & Architecture

### Page Layout Architecture

The landing page (`app/page.tsx`) uses a unique scroll behavior:
- **First 3 sections** (Hero, RedSea, Amaala) have fullpage scroll-snap behavior
- **Remaining sections** (Resorts, Offers, Experiences, Location, Weather, Footer) scroll normally
- All wrapped in `.fullpage-container` with scroll management

### Component Organization

```
components/
  └── landing/              # All landing page sections
      ├── Navbar.tsx        # Site navigation
      ├── HeroSection.tsx   # First section (scroll-snap)
      ├── RedSeaSection.tsx # Second section (scroll-snap)
      ├── AmaalaSection.tsx # Third section (scroll-snap)
      ├── ResortsSection.tsx
      ├── OffersSection.tsx
      ├── ExperiencesSection.tsx
      ├── LocationSection.tsx
      ├── WeatherSection.tsx
      └── Footer.tsx
```

Components in `components/landing/` are section-specific. They compose to form the landing page in order.

### Styling & Utilities

- **Path Alias**: `@/*` maps to project root (e.g., `@/components`, `@/lib`)
- **Utility Function**: `cn()` in `lib/utils.ts` for conditional className merging (combines clsx + tailwind-merge)
- **Custom Font**: FedraSerif Arabic loaded via `next/font/local` in `app/layout.tsx`
- **RTL Configuration**: HTML lang is `"ar"` with `dir="rtl"` in root layout
- **Tailwind v4**: Uses `@tailwindcss/postcss` plugin (no tailwind.config file needed)

### shadcn/ui Configuration

Located in `components.json`:
- Style: `new-york`
- RTL support: enabled
- Base color: `neutral`
- CSS variables: enabled
- Icon library: `lucide`
- Aliases point to `@/components`, `@/lib/utils`, etc.

When adding shadcn components, they will be installed to `components/ui/` with RTL support.

## Key Conventions

1. **RTL-First**: All layouts and components should support RTL. Use logical properties (e.g., `ms-4` instead of `ml-4`)
2. **Arabic Typography**: Default font is FedraSerifArabic (CSS variable: `--font-fedra`)
3. **Component Structure**: Landing sections are self-contained in `components/landing/`
4. **Imports**: Always use `@/` path alias for cleaner imports
5. **Tailwind CSS v4**: Use `@theme` and CSS-based configuration in `globals.css`, not JS config files
