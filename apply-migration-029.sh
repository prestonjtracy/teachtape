#!/bin/bash
# Script to apply migration 029 to remote Supabase database

echo "📝 Applying migration: 029_add_film_review_columns.sql"
echo "⚠️  Make sure you have SUPABASE_DB_URL in your .env file"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Create a .env file with: SUPABASE_DB_URL=your_connection_string"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Apply the migration
npx supabase db push --db-url "$SUPABASE_DB_URL"

echo ""
echo "✅ Migration applied! Refresh your browser to see the changes."
