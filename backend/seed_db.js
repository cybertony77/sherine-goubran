import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvConfig() {
  try {
    const envPath = path.join(__dirname, '..', 'env.config');
    
    // Check if file exists
    if (!fs.existsSync(envPath)) {
      console.log(`⚠️  env.config not found at: ${envPath}`);
      console.log('   Using process.env as fallback');
      return {};
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index !== -1) {
          const key = trimmed.substring(0, index).trim();
          let value = trimmed.substring(index + 1).trim();
          value = value.replace(/^"|"$/g, ''); // strip quotes
          envVars[key] = value;
        }
      }
    });

    console.log('✅ Successfully loaded env.config');
    return envVars;
  } catch (error) {
    console.log('⚠️  Could not read env.config:', error.message);
    console.log('   Using process.env as fallback');
    return {};
  }
}

const envConfig = loadEnvConfig();
const MONGO_URI =
  envConfig.MONGO_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/demo-attendance-system';
const DB_NAME =
  envConfig.DB_NAME || process.env.DB_NAME || 'demo-attendance-system';

if (!MONGO_URI) {
  throw new Error('❌ MONGO_URI not found in env.config');
}

console.log('🔗 Using Mongo URI:', MONGO_URI.replace(/\/\/.*@/, '//****@'));

const EMPTY_COLLECTIONS = [
  'blogs',
  'categories',
  'certificates',
  'events_and_workshops',
  'messages',
  'personal_info',
  'public_testimonials',
  'services',
  'testimonials',
];

/** All collections that must exist (matches Compass / production schema). */
const REQUIRED_COLLECTIONS = ['users', 'subscription', ...EMPTY_COLLECTIONS];

async function ensureCollectionsExist(db) {
  console.log('🔍 Checking if collections exist...');

  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((col) => col.name);

  for (const name of REQUIRED_COLLECTIONS) {
    if (!collectionNames.includes(name)) {
      console.log(`📁 Creating ${name} collection...`);
      await db.createCollection(name);
      console.log(`✅ ${name} collection created`);
    } else {
      console.log(`✅ ${name} collection already exists`);
    }
  }

  console.log(`📋 Ensured ${REQUIRED_COLLECTIONS.length} collections:`);
  for (const name of REQUIRED_COLLECTIONS) {
    console.log(`   - ${name}`);
  }
}

async function seedDatabase() {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    await ensureCollectionsExist(db);

    console.log('🗑️ Clearing users and subscription...');
    await db.collection('users').deleteMany({});
    await db.collection('subscription').deleteMany({});
    console.log('✅ Cleared');

    // Create users (assistants/admin/developer)
    const assistants = [
      {
        id: 'tony',
        name: 'Tony Joseph',
        phone: '201211172756',
        email: 'tony.joseph.business1717@gmail.com',
        role: 'developer',
        password: await bcrypt.hash('tony', 10),
        account_state: 'Activated',
      },
    ];

    console.log('👥 Creating users...');
    await db.collection('users').insertMany(assistants);
    console.log(`✅ Created ${assistants.length} users`);

    // Initialize subscription collection with default document
    console.log('🧾 Initializing subscription collection...');
    const subscriptionDoc = {
      subscription_duration: null,
      date_of_subscription: null,
      date_of_expiration: null,
      cost: null,
      note: null,
      active: false,
    };
    await db.collection('subscription').insertOne(subscriptionDoc);
    console.log('✅ Subscription collection initialized with default document');

    console.log('📂 Empty collections ready:');
    for (const name of EMPTY_COLLECTIONS) {
      console.log(`   - ${name}`);
    }

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${assistants.length} users created`);
    console.log('- Subscription collection initialized with default document');
    console.log(`- ${REQUIRED_COLLECTIONS.length} collections ensured (users, subscription + content)`);
    console.log('\n🔑 Login Credentials:');
    console.log('Tony ID: tony, Password: tony');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    if (client) await client.close();
  }
}

seedDatabase();
