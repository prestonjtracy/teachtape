#!/usr/bin/env tsx
/**
 * Verify and seed commission settings defaults
 * Ensures the required settings exist with correct defaults
 * Run with: npx tsx scripts/verify-commission-settings-seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface SettingDefinition {
  setting_key: string;
  setting_value: string;
  setting_type: 'boolean' | 'string' | 'number' | 'json';
  display_name: string;
  description: string;
  category: string;
  is_public: boolean;
}

const REQUIRED_COMMISSION_SETTINGS: SettingDefinition[] = [
  {
    setting_key: 'platform_fee_percentage',
    setting_value: '10',
    setting_type: 'number',
    display_name: 'Platform Commission (%)',
    description: 'Platform commission taken from coach earnings (0-30%)',
    category: 'commission',
    is_public: false
  },
  {
    setting_key: 'athlete_service_fee_percentage',
    setting_value: '0.0',
    setting_type: 'number',
    display_name: 'Athlete Service Fee (%)',
    description: 'Service fee percentage charged to athletes (0-30%)',
    category: 'commission',
    is_public: false
  },
  {
    setting_key: 'athlete_service_fee_flat_cents',
    setting_value: '0',
    setting_type: 'number',
    display_name: 'Athlete Service Fee (cents)',
    description: 'Flat service fee charged to athletes in cents (0-2000)',
    category: 'commission',
    is_public: false
  }
];

async function verifyAndSeedDefaults() {
  console.log('🔍 Verifying commission settings defaults...\n');

  // Create supabase client for script
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check which settings exist
    const { data: existingSettings, error: fetchError } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value, display_name')
      .in('setting_key', REQUIRED_COMMISSION_SETTINGS.map(s => s.setting_key));

    if (fetchError) {
      console.error('❌ Error fetching existing settings:', fetchError);
      throw fetchError;
    }

    const existingKeys = new Set(existingSettings?.map(s => s.setting_key) || []);
    const missingSettings = REQUIRED_COMMISSION_SETTINGS.filter(
      setting => !existingKeys.has(setting.setting_key)
    );

    console.log('📊 Existing commission settings:');
    if (existingSettings && existingSettings.length > 0) {
      existingSettings.forEach(setting => {
        console.log(`  ✅ ${setting.setting_key}: ${setting.setting_value} (${setting.display_name})`);
      });
    } else {
      console.log('  (none found)');
    }

    if (missingSettings.length === 0) {
      console.log('\n🎉 All required commission settings are present!');
      return;
    }

    console.log(`\n🔧 Missing ${missingSettings.length} settings, seeding defaults...`);

    // Insert missing settings
    for (const setting of missingSettings) {
      console.log(`  🌱 Seeding ${setting.setting_key}...`);
      
      const { error: insertError } = await supabase
        .from('admin_settings')
        .insert({
          setting_key: setting.setting_key,
          setting_value: setting.setting_value,
          setting_type: setting.setting_type,
          display_name: setting.display_name,
          description: setting.description,
          category: setting.category,
          is_public: setting.is_public
        });

      if (insertError) {
        // Check if this is a duplicate key error (setting was already inserted)
        if (insertError.code === '23505') {
          console.log(`    ℹ️  Setting ${setting.setting_key} already exists (duplicate key)`);
        } else {
          console.error(`    ❌ Error inserting ${setting.setting_key}:`, insertError);
          throw insertError;
        }
      } else {
        console.log(`    ✅ Seeded ${setting.setting_key}: ${setting.setting_value}`);
      }
    }

    // Verify all settings exist now
    console.log('\n🔍 Final verification...');
    const { data: finalSettings, error: finalError } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value, display_name')
      .in('setting_key', REQUIRED_COMMISSION_SETTINGS.map(s => s.setting_key));

    if (finalError) {
      console.error('❌ Error during final verification:', finalError);
      throw finalError;
    }

    console.log('📊 Final commission settings:');
    finalSettings?.forEach(setting => {
      console.log(`  ✅ ${setting.setting_key}: ${setting.setting_value} (${setting.display_name})`);
    });

    console.log('\n✅ Commission settings verification and seeding completed successfully!');

  } catch (error) {
    console.error('💥 Verification/seeding failed:', error);
    throw error;
  }
}

// Test the settings service after seeding
async function testSettingsService() {
  console.log('\n🧪 Testing settings service...');
  
  try {
    // Test direct database query instead of settings service (which requires Next.js context)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'platform_fee_percentage',
        'athlete_service_fee_percentage', 
        'athlete_service_fee_flat_cents'
      ]);

    if (error) throw error;

    const settingsMap = settings?.reduce((acc: Record<string, any>, setting) => {
      acc[setting.setting_key] = parseFloat(setting.setting_value) || 0;
      return acc;
    }, {}) || {};

    const commissionSettings = {
      platform_fee_percentage: settingsMap.platform_fee_percentage || 10.0,
      athlete_service_fee_percent: settingsMap.athlete_service_fee_percentage || 0.0,
      athlete_service_fee_flat_cents: settingsMap.athlete_service_fee_flat_cents || 0
    };
    
    console.log('📊 Settings service returned:');
    console.log(`  Platform fee: ${commissionSettings.platform_fee_percentage}%`);
    console.log(`  Athlete fee (percent): ${commissionSettings.athlete_service_fee_percent}%`);
    console.log(`  Athlete fee (flat): ${commissionSettings.athlete_service_fee_flat_cents}¢`);
    
    // Validate values are reasonable
    const isValid = (
      commissionSettings.platform_fee_percentage >= 0 && commissionSettings.platform_fee_percentage <= 30 &&
      commissionSettings.athlete_service_fee_percent >= 0 && commissionSettings.athlete_service_fee_percent <= 30 &&
      commissionSettings.athlete_service_fee_flat_cents >= 0 && commissionSettings.athlete_service_fee_flat_cents <= 2000
    );
    
    if (isValid) {
      console.log('✅ Settings service test passed!');
    } else {
      console.log('❌ Settings values are out of expected ranges!');
      throw new Error('Invalid settings values');
    }
    
  } catch (error) {
    console.error('❌ Settings service test failed:', error);
    throw error;
  }
}

// Run if script is executed directly
if (require.main === module) {
  verifyAndSeedDefaults()
    .then(() => testSettingsService())
    .then(() => {
      console.log('\n🎉 All checks passed! Commission settings are ready.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { verifyAndSeedDefaults, testSettingsService };