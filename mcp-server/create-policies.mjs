// Script to create storage policies for the estimations bucket
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role for policy creation
);

async function createStoragePolicies() {
    console.log('🔐 Creating storage policies for "estimations" bucket...\n');

    // Policy 1: Allow authenticated users to upload
    const insertPolicy = await supabase.rpc('exec_sql', {
        sql: `
      CREATE POLICY IF NOT EXISTS "Users can upload estimations"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'estimations');
    `
    });

    if (insertPolicy.error) {
        console.log('Insert policy result:', insertPolicy.error.message);
    } else {
        console.log('✅ Insert policy created');
    }

    // Policy 2: Allow authenticated users to download their files
    const selectPolicy = await supabase.rpc('exec_sql', {
        sql: `
      CREATE POLICY IF NOT EXISTS "Users can download estimations"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'estimations');
    `
    });

    if (selectPolicy.error) {
        console.log('Select policy result:', selectPolicy.error.message);
    } else {
        console.log('✅ Select policy created');
    }

    // Policy 3: Allow users to update their files
    const updatePolicy = await supabase.rpc('exec_sql', {
        sql: `
      CREATE POLICY IF NOT EXISTS "Users can update estimations"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'estimations');
    `
    });

    if (updatePolicy.error) {
        console.log('Update policy result:', updatePolicy.error.message);
    } else {
        console.log('✅ Update policy created');
    }

    console.log('\n✅ Done!');
}

createStoragePolicies();
