/**
 * migrate-blob-to-relational.js
 *
 * ⚠️  THIS SCRIPT IS OBSOLETE.
 *
 * It was a one-shot Prisma/PostgreSQL migration script used to promote
 * a legacy JSON blob format into relational tables. The backend has since
 * been migrated from Prisma + PostgreSQL to Mongoose + MongoDB.
 *
 * Mongoose creates collections automatically on first write — no migration
 * script is needed for a fresh MongoDB setup.
 *
 * If you need to migrate existing PostgreSQL data into MongoDB:
 *  1. Export from Postgres using pg_dump or a custom SELECT query.
 *  2. Transform IDs (cuid → ObjectId) and write a custom import script.
 *  3. Run your import script against the MONGODB_URI in backend/.env.
 */

console.log('This script is obsolete. See the comment at the top for details.');
process.exit(0);
