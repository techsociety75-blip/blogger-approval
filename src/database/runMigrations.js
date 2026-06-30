/**
 * Database Migration Runner
 * Executes all migration files in order
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting database migrations...\n');

    // Read all migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('✓ No migrations to run');
      return;
    }

    // Execute schema.sql first
    console.log('📋 Creating base schema...');
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSQL);
    console.log('✓ Base schema created\n');

    // Execute each migration
    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`⚙️  Running migration: ${file}`);
      try {
        await client.query(sql);
        console.log(`✓ Migration completed: ${file}\n`);
      } catch (error) {
        console.error(`❌ Migration failed: ${file}`);
        console.error(error.message);
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

// Run migrations
runMigrations();
