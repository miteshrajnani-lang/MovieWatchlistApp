
const SUPABASE_URL = 'https://egtlispxzlwcjxedqgyx.supabase.co';

// Paste your sb_publishable_ key from Supabase here.
// Never use an sb_secret_ key in frontend code.
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vtqodnLp7zyYc8dTr19j-w_s7lKwYhG';

if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase library failed to load.');
} else {
    window.supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    console.log('Supabase client initialized successfully.');
}
