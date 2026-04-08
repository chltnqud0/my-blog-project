# Soobyeong Blog

A personal blog project built with Next.js, Prisma, and PostgreSQL.

## Stack
- Next.js (App Router)
- TypeScript
- Prisma
- PostgreSQL (Docker for local development)
- NextAuth (Credentials)

## Quick Start
1. Install dependencies
```powershell
npm install
```

2. Create the environment file
```powershell
Copy-Item .env.example .env
```

3. Start PostgreSQL with Docker
```powershell
docker compose up -d
```

4. Prepare Prisma
```powershell
npx prisma generate
npx prisma db push --accept-data-loss
```

5. Start the development server
```powershell
npm run dev
```

## Admin
- Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `NEXTAUTH_SECRET` in `.env`
- Sign in at `/login`
- Only the admin can create, edit, and delete posts
