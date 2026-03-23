const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { PrismaClient } = require('./generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Add it to backend/.env');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
