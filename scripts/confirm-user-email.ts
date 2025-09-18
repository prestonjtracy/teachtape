#!/usr/bin/env tsx

// Manual script to confirm user email in development
// Usage: tsx scripts/confirm-user-email.ts <email>

import { createAdminClient } from '../lib/supabase/server'

async function confirmUserEmail(email: string) {
  if (!email) {
    console.error('❌ Please provide an email address')
    console.log('Usage: tsx scripts/confirm-user-email.ts <email>')
    process.exit(1)
  }

  const supabase = createAdminClient()

  try {
    // Get user by email
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers()
    
    if (getUserError) {
      console.error('❌ Error fetching users:', getUserError)
      return
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.error('❌ User not found with email:', email)
      return
    }

    console.log('👤 Found user:', {
      id: user.id,
      email: user.email,
      emailConfirmed: !!user.email_confirmed_at,
      createdAt: user.created_at
    })

    if (user.email_confirmed_at) {
      console.log('✅ User email is already confirmed!')
      return
    }

    // Manually confirm email
    const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true
    })

    if (confirmError) {
      console.error('❌ Error confirming email:', confirmError)
      return
    }

    console.log('✅ Email confirmed successfully!')
    
    // Verify confirmation
    const { data: updatedUser, error: verifyError } = await supabase.auth.admin.getUserById(user.id)
    
    if (verifyError) {
      console.error('❌ Error verifying confirmation:', verifyError)
      return
    }

    console.log('🎉 Verification complete:', {
      id: updatedUser.user.id,
      email: updatedUser.user.email,
      emailConfirmed: !!updatedUser.user.email_confirmed_at,
      confirmedAt: updatedUser.user.email_confirmed_at
    })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get email from command line arguments
const email = process.argv[2]
confirmUserEmail(email)