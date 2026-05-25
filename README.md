# Chick and Piggy Frontend

Frontend de e-commerce construido con Next.js 16, React 19 y TypeScript.

## Requisitos

- Node.js 20 o superior
- npm

## Instalacion

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicacion queda disponible en `http://localhost:3000`.

## Variables de entorno

1. Crea `.env.local` a partir de `.env.example`.
2. Completa las claves necesarias para Strapi, Stripe, Google Maps y Google Analytics.

Variables incluidas en `.env.example`:

- `SITE_URL`
- `STRAPI_URL`
- `STRAPI_API_TOKEN`
- `STRAPI_ACTIVE_SHIPPING_ORIGIN_PATH`
- `STRAPI_CHECKOUT_QUOTE_PATH`
- `STRAPI_DISCOUNT_PATH`
- `STRAPI_CHECKOUT_PAYMENT_INTENT_PATH`
- `STRAPI_STRIPE_CHECKOUT_PATH`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

Notas rapidas:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` activa Google Analytics 4 en el frontend.
- Si no defines `NEXT_PUBLIC_GA_MEASUREMENT_ID`, la app no carga Google Analytics.

## Scripts

```bash
npm run dev
npm run typecheck
npm run build
npm run start
```

## Subir a GitHub

Este repositorio esta preparado para subirse sin incluir:

- `node_modules`
- `.next`
- `.env.local`
- caches y artefactos de build

Pasos sugeridos:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <tu-repo>
git push -u origin main
```
