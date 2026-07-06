const SupabaseClient = (() => {
    const config = window.SUPABASE_CONFIG || {};
    const isConfigured = Boolean(config.url && config.anonKey);

    let client = null;
    if (isConfigured && window.supabase) {
        try {
            client = window.supabase.createClient(config.url, config.anonKey);
        } catch (e) {
            console.error('Supabase client init failed:', e);
        }
    }

    return { client, isConfigured };
})();

window.SupabaseClient = SupabaseClient;
