const AuthService = (() => {
    const isConfigured = window.SupabaseClient ? window.SupabaseClient.isConfigured : false;
    const client = window.SupabaseClient ? window.SupabaseClient.client : null;

    async function signUp(email, password, username) {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const { data, error } = await client.auth.signUp({ email, password, options: { data: { username } } });
            if (error) return { error: error.message };
            if (!data.user) return { error: 'Không tạo được tài khoản.' };

            if (!data.session) {
                return { pendingConfirmation: true };
            }

            return { user: data.user };
        } catch (e) {
            return { error: e.message };
        }
    }

    async function signIn(email, password) {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) return { error: error.message };
            return { user: data.user };
        } catch (e) {
            return { error: e.message };
        }
    }

    async function ensureProfile(user, fallbackUsername) {
        if (!client || !user) return null;
        const existing = await getProfile(user.id);
        if (existing) return existing;

        const baseUsername = fallbackUsername || (user.user_metadata && user.user_metadata.username) || (user.email ? user.email.split('@')[0] : 'user');

        async function tryInsert(username) {
            const { data, error } = await client.from('profiles').insert({
                id: user.id,
                username,
                email: user.email || null,
                role: 'user',
                xp: 0,
                weekly_xp: 0,
                streak: 0,
                hearts: 10, // keep in sync with MAX_HEARTS in app.js - not shared scope
                banned: false,
                stats: {}
            }).select().maybeSingle();
            if (error) throw error;
            return data;
        }

        try {
            return await tryInsert(baseUsername);
        } catch (e) {
            // Postgres unique-violation on the username column specifically (not some other
            // failure like a missing table) - the auth account already exists at this point,
            // so silently failing here would permanently lock the user out (the sign-in screen
            // has no username field to let them pick a different one). Auto-disambiguate instead
            // of blocking - the account remains usable, and the caller can tell the user their
            // requested name was taken.
            const isDuplicateUsername = e && e.code === '23505' && /profiles_username_key/.test(e.message || '');
            if (!isDuplicateUsername) {
                console.error('Failed to create profile:', e);
                return null;
            }
            const disambiguated = `${baseUsername}_${Math.random().toString(36).slice(2, 6)}`;
            try {
                const data = await tryInsert(disambiguated);
                if (data) data.usernameWasTaken = baseUsername;
                return data;
            } catch (e2) {
                console.error('Failed to create profile even with disambiguated username:', e2);
                return null;
            }
        }
    }

    async function signOut() {
        if (!client) return;
        await client.auth.signOut();
    }

    async function getSession() {
        if (!client) return null;
        const { data } = await client.auth.getSession();
        return data.session || null;
    }

    async function getProfile(userId) {
        if (!client) return null;
        try {
            const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('Failed to fetch profile:', e);
            return null;
        }
    }

    async function updateProfile(userId, fields) {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const { error } = await client.from('profiles').update(fields).eq('id', userId);
            if (error) return { error: error.message };
            return {};
        } catch (e) {
            return { error: e.message };
        }
    }

    async function listAllProfiles() {
        if (!client) return [];
        try {
            const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to list profiles (may not be admin):', e);
            return [];
        }
    }

    async function deleteProfile(userId) {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const { error } = await client.from('profiles').delete().eq('id', userId);
            if (error) return { error: error.message };
            return {};
        } catch (e) {
            return { error: e.message };
        }
    }

    // Uploads to the `avatars` storage bucket under a per-user folder (avatars/<uid>/...)
    // so storage RLS can restrict writes to your own folder while keeping the bucket
    // itself public for reads (see supabase/migrations/avatars_storage.sql). Returns a
    // public URL - suffixed with a cache-busting timestamp since the filename itself
    // stays constant across re-uploads and browsers would otherwise keep showing the
    // old cached image.
    async function uploadAvatar(userId, file) {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `${userId}/avatar.${ext}`;
            const { error: uploadError } = await client.storage
                .from('avatars')
                .upload(path, file, { upsert: true, cacheControl: '3600' });
            if (uploadError) return { error: uploadError.message };
            const { data } = client.storage.from('avatars').getPublicUrl(path);
            return { url: `${data.publicUrl}?t=${Date.now()}` };
        } catch (e) {
            return { error: e.message };
        }
    }

    // Same upload pattern as uploadAvatar() above, just under a "group-<id>" path prefix
    // instead of the user's own uid - the storage RLS policies added in
    // groups_schema.sql (group_avatar_upload_by_admin etc.) key off that exact prefix to
    // check the caller has an owner/admin role for this specific group.
    async function uploadGroupAvatar(groupId, file) {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `group-${groupId}/avatar.${ext}`;
            const { error: uploadError } = await client.storage
                .from('avatars')
                .upload(path, file, { upsert: true, cacheControl: '3600' });
            if (uploadError) return { error: uploadError.message };
            const { data } = client.storage.from('avatars').getPublicUrl(path);
            return { url: `${data.publicUrl}?t=${Date.now()}` };
        } catch (e) {
            return { error: e.message };
        }
    }

    // Sends the Supabase password-reset email. redirectTo points back at the current
    // page - when the user clicks the emailed link, they land here with a recovery
    // session and onPasswordRecovery() (below) fires so the app can show a
    // "set new password" screen.
    async function requestPasswordReset(email) {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const redirectTo = location.origin + location.pathname;
            const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) return { error: error.message };
            return {};
        } catch (e) {
            return { error: e.message };
        }
    }

    // Fires the callback once when the user arrives via a password-recovery email link
    // (Supabase parses the link's token from the URL hash and emits PASSWORD_RECOVERY).
    function onPasswordRecovery(callback) {
        if (!client) return;
        client.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') callback();
        });
    }

    // Both of these call SECURITY DEFINER SQL functions (see
    // supabase/migrations/self_service_inbox_vibrancy.sql) because the work fans out
    // across tables the client's own RLS grants can't reach (denormalized username
    // copies, the auth.users row itself).
    async function renameAccount(newUsername) {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const { data, error } = await client.rpc('rename_own_account', { p_new_username: newUsername });
            if (error) return { error: error.message };
            return { username: data };
        } catch (e) {
            return { error: e.message };
        }
    }

    async function deleteOwnAccount() {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const { error } = await client.rpc('delete_own_account');
            if (error) return { error: error.message };
            return {};
        } catch (e) {
            return { error: e.message };
        }
    }

    async function updatePassword(newPassword) {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const { error } = await client.auth.updateUser({ password: newPassword });
            if (error) return { error: error.message };
            return {};
        } catch (e) {
            return { error: e.message };
        }
    }

    async function resetAllWeeklyXp() {
        if (!client) return { error: 'Chưa cấu hình đăng nhập.' };
        try {
            const { error } = await client.from('profiles').update({ weekly_xp: 0 }).neq('username', '');
            if (error) return { error: error.message };
            return {};
        } catch (e) {
            return { error: e.message };
        }
    }

    return { isConfigured, signUp, signIn, signOut, getSession, getProfile, ensureProfile, updateProfile, listAllProfiles, deleteProfile, resetAllWeeklyXp, uploadAvatar, uploadGroupAvatar, updatePassword, requestPasswordReset, onPasswordRecovery, renameAccount, deleteOwnAccount };
})();

window.AuthService = AuthService;
