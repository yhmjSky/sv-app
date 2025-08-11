import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	driver: 'd1-http',
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
		databaseId: process.env.CLOUDFLARE_DATABASE_ID || '7c692a4d-ce47-4b49-83ec-b39c66a0e7ba',
		token: process.env.CLOUDFLARE_API_TOKEN || ''
	},
	verbose: true,
	strict: true
});
