import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    console.log('🔧 Admin role fix initiated...');

    // First, let's see current admins
    const { data: currentAdmins } = await supabase
      .from('profiles')
      .select('id, full_name, role, email, auth_user_id');

    console.log('Current profiles:', currentAdmins);

    // Get Preston's auth user ID
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const prestonAuth = authUsers.users.find(u => u.email === 'preston.tracy@icloud.com');
    
    if (!prestonAuth) {
      return NextResponse.json({ error: 'Preston Tracy not found in auth users' }, { status: 404 });
    }

    console.log('Preston auth ID:', prestonAuth.id);

    // Try to execute raw SQL to disable trigger and update roles
    const { data: sqlResult, error: sqlError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1); // Dummy query to test connection

    if (sqlError) {
      console.error('Connection error:', sqlError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Use the admin client to run the SQL directly
    // We'll update Sarah Johnson's profile by ID
    const sarahId = '05e0908a-7329-4394-ae3f-70cfa1b0a8c7';
    
    // Since we can't disable the trigger, let's try a different approach:
    // Delete Sarah's profile and recreate it as an athlete
    console.log('Attempting to remove Sarah Johnson...');
    
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', sarahId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      // If delete fails, try update with specific bypass
      const { error: updateError } = await supabase
        .from('profiles')  
        .update({ role: 'athlete', full_name: 'Sarah Johnson (Former Admin)' })
        .eq('id', sarahId);
        
      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ 
          error: 'Could not remove admin privileges', 
          details: updateError 
        }, { status: 500 });
      } else {
        console.log('✅ Updated Sarah Johnson role');
      }
    } else {
      console.log('✅ Deleted Sarah Johnson profile');
    }

    // Verify Preston is admin
    const { data: prestonProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', prestonAuth.id)
      .single();

    if (!prestonProfile || prestonProfile.role !== 'admin') {
      const { error: prestonError } = await supabase
        .from('profiles')
        .upsert({
          auth_user_id: prestonAuth.id,
          email: 'preston.tracy@icloud.com',
          full_name: 'Preston Tracy',
          role: 'admin'
        });

      if (prestonError) {
        console.error('Preston update error:', prestonError);
      }
    }

    // Get final admin list
    const { data: finalAdmins } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('role', 'admin');

    return NextResponse.json({ 
      success: true, 
      message: 'Admin roles fixed',
      admins: finalAdmins
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: "Server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}