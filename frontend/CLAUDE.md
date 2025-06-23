# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 frontend for Portugal Running - a comprehensive platform for discovering Portuguese running events. The application uses the App Router with TypeScript, TailwindCSS v4, and is deployed on Cloudflare Workers via OpenNext.js.

## Development Commands

### Primary Commands
- `npm run dev` - Start development server with Turbopack on port 5173
- `npm run build` - Build production version
- `npm run lint` - Run ESLint validation
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run preview` - Preview Cloudflare deployment locally

### Alternative Commands (using just)
- `just dev` - Run development server with demon process manager
- `just build` - Build the application
- `just lint` - Run linting
- `just stop` - Stop the dev server
- `just start` - Start the dev server using just
- `just logs` - View dev server logs
- `demon list` - Check if the dev server is running

## Architecture

### Core Structure
- **app/**: Next.js App Router pages with TypeScript
- **components/**: React components split into base UI components (`ui/`) and feature-specific components
- **hooks/**: Custom React hooks for events, geolocation, saved events, and theme management
- **lib/**: Type definitions, utilities, and Zod schemas
- **public/**: Static event data (`events.json`, district data) and media assets

### Key Features
- **Event Discovery**: Search and filter Portuguese running events by type, location, date, and distance
- **Geolocation Integration**: Proximity-based event filtering using browser geolocation
- **Saved Events**: Persistent storage using localStorage
- **Theme System**: Dark/light mode with system preference detection
- **Interactive Maps**: Leaflet integration for event locations

### Data Flow
- Event data is loaded from static JSON files in `/public/`
- All data uses Zod schemas for runtime validation
- Event filtering is handled client-side with complex multi-dimensional filtering
- Portuguese district data provides location-based filtering capabilities

### Tech Stack Details
- **Framework**: Next.js 15.3.3 with App Router and Turbopack
- **Styling**: TailwindCSS v4 with custom design system
- **UI Components**: Radix UI primitives with custom styling
- **Deployment**: Cloudflare Workers via OpenNext.js adapter
- **Type Safety**: Full TypeScript with strict configuration and Zod runtime validation

## Development Notes

### Component Patterns
- Use Radix UI primitives for accessible base components
- Follow the established shadcn/ui-style component patterns in `components/ui/`
- Implement responsive design with Tailwind's mobile-first approach

### Data Handling
- Event data schema is defined in `lib/types.ts` with Zod validation
- Portuguese district codes follow ISO 3166-2:PT standard
- Event images use hash-based filenames in `/public/media/`

### Deployment
- Production builds are optimized for Cloudflare Workers edge deployment
- Static assets are served from Cloudflare's global CDN
- Use `npm run cf-typegen` to generate Cloudflare environment types when needed

### Localization
- UI text and date formatting is in Portuguese
- Distance calculations use metric units
- Location data includes Portuguese administrative regions

### Build Commands
- `just build` - Build the frontend using just command
- `just lint` - Lint the frontend using just command