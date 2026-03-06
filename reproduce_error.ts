import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pgTable, uuid, text } from 'drizzle-orm/pg-core';

// Minimal reproduction
const testTable = pgTable('test_table', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
});

async function runTest() {
    console.log('Starting test...');
    const client = new PGlite();
    const db = drizzle(client);

    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL
      );
    `);
        console.log('Table created.');

        console.log('Attempting insert with returning()...');
        const result = await db.insert(testTable).values({ name: 'Test' }).returning();
        console.log('Insert successful:', result);
    } catch (err) {
        console.error('Test failed:', err);
    }
}

runTest();
