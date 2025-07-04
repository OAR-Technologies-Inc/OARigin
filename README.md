# OARigin

**OARigin** is a cooperative text adventure where an AI Game Master guides players through branching stories. The app is built with React, Vite and Tailwind and uses Supabase for data storage and authentication.

## Prerequisites

- Node.js 18 or later
- A Supabase project (URL and anon key)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and update it with your Supabase credentials:
   ```bash
   cp .env.example .env
   # then edit .env with your values
   ```
   Optionally set `VITE_ENABLE_DEV_MODE=true` and add your `OPENAI_API_KEY` if
   you want to test AI features locally. Both variables are optional for
   development.

## Running the app

Start the development server:
```bash
npm run dev
```
Open `http://localhost:5173` to view the app.

To check code quality and build for production:
```bash
npm run lint    # run ESLint
npm run build   # create a production build
```

## Connectivity test

A small script is provided to verify your Supabase credentials. After installing `ts-node`, run:
```bash
npx ts-node src/utils/supabaseTest.ts
```
This script attempts a simple query and prints the results to the console.
