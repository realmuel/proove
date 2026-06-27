This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Run with Docker

The whole app runs in a single container — no environment variables to set:

```bash
docker compose up -d --build
```

Then open [http://localhost:3103](http://localhost:3103).

- The container listens on port **3103**. To use a different host port, change
  the left-hand number in `docker-compose.yml` (`"8080:3103"`, etc.).
- Two named volumes persist your data: `proove-db` (the SQLite database) and
  `proove-uploads` (recipe/meal images).
- On first start the database is created automatically from the Drizzle
  migrations. An existing database is detected and left untouched.

To bring your existing local data along, copy `sqlite.db` into the `proove-db`
volume and your `public/uploads` into the `proove-uploads` volume before
starting.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
