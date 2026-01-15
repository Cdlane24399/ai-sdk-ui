import { neon } from "@neondatabase/serverless";

// Validate DATABASE_URL is set
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please configure your Neon database connection string."
    );
  }
  return url;
};

// Database connection using Neon serverless driver
const sql = neon(getDatabaseUrl());

export { sql };

// Initialize database tables
export async function initializeDatabase() {
  // Create users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create chats table
  await sql`
    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
      model_id VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create messages table
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create indexes for better query performance
  await sql`
    CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)
  `;
}
