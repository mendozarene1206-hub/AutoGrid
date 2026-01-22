// Quick script to check existing data in Supabase
// Run from mcp-server directory
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
    console.log('🔍 Checking Supabase for existing data...\n');

    // 1. Count spreadsheets
    const { data: spreadsheets, error: ssError } = await supabase
        .from('spreadsheets')
        .select('id, status, created_at, updated_at')
        .order('created_at', { ascending: false });

    if (ssError) {
        console.error('Error fetching spreadsheets:', ssError.message);
        return;
    }

    console.log(`📊 Total Spreadsheets: ${spreadsheets?.length || 0}`);

    if (spreadsheets && spreadsheets.length > 0) {
        console.log('\nRecent projects:');
        spreadsheets.slice(0, 5).forEach((s, i) => {
            console.log(`  ${i + 1}. ID: ${s.id.substring(0, 8)}... | Status: ${s.status} | Created: ${s.created_at}`);
        });

        // Check size of raw_data for first project
        const { data: sample } = await supabase
            .from('spreadsheets')
            .select('raw_data')
            .eq('id', spreadsheets[0].id)
            .single();

        if (sample?.raw_data) {
            const sizeBytes = JSON.stringify(sample.raw_data).length;
            const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
            console.log(`\n📦 Sample raw_data size (most recent): ${sizeMB} MB`);
        }
    }

    // 2. Count signatures
    const { count: sigCount } = await supabase
        .from('signatures')
        .select('*', { count: 'exact', head: true });

    console.log(`\n✍️ Total Signatures: ${sigCount || 0}`);

    // 3. Count user profiles
    const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

    console.log(`👥 Total User Profiles: ${userCount || 0}`);

    console.log('\n✅ Data check complete.');
}

checkData();
