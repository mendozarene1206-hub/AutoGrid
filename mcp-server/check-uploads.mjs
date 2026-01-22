// Check the latest spreadsheet records to see if storage_path is set
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSpreadsheets() {
    console.log('🔍 Checking spreadsheet records...\n');

    const { data, error } = await supabase
        .from('spreadsheets')
        .select('id, status, storage_path, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('Recent spreadsheets:');
    data.forEach((s, i) => {
        console.log(`${i + 1}. ID: ${s.id.substring(0, 12)}...`);
        console.log(`   Status: ${s.status}`);
        console.log(`   Storage Path: ${s.storage_path || '(null)'}`);
        console.log(`   Updated: ${s.updated_at}`);
        console.log('');
    });

    // Check if any files exist in the estimations bucket
    console.log('📦 Checking estimations bucket...');
    const { data: files, error: storageError } = await supabase.storage
        .from('estimations')
        .list('', { limit: 10 });

    if (storageError) {
        console.error('Storage error:', storageError.message);
    } else {
        console.log(`Files in bucket: ${files?.length || 0}`);
        files?.forEach(f => console.log(`  - ${f.name}`));
    }
}

checkSpreadsheets();
