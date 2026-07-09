// Wrapped in an IIFE (same reason as friends.js/duel.js) - this file is loaded via a
// classic <script> tag in the same shared global lexical scope as those files, so a
// top-level `const isConfigured`/`const client` here would collide with theirs.
(() => {
    const isConfigured = window.SupabaseClient ? window.SupabaseClient.isConfigured : false;
    const client = window.SupabaseClient ? window.SupabaseClient.client : null;

    // Soft cap enforced at the point of approval (see approveJoinRequest) rather than a
    // DB constraint - a COUNT-then-INSERT constraint is race-prone under concurrent
    // approvals, and this is a casual social feature, not an anti-cheat system (same
    // stance already documented for friendships/duels elsewhere in this app).
    const MAX_MEMBERS = 30;
    const MAX_MESSAGE_LENGTH = 500;

    async function createGroup(myProfile, name, description) {
        if (!client || !myProfile || !name) return { error: 'Chưa cấu hình.' };
        const trimmedName = name.trim();
        if (trimmedName.length < 2 || trimmedName.length > 40) return { error: 'Tên group phải từ 2-40 ký tự.' };
        try {
            const { data: group, error } = await client.from('groups').insert({
                name: trimmedName,
                description: (description || '').trim() || null,
                owner_id: myProfile.id,
                owner_username: myProfile.username
            }).select().single();
            if (error) {
                if (error.code === '23505') return { error: 'Tên group này đã được sử dụng.' };
                throw error;
            }
            // Owner's own membership row - group_members_insert_self's RLS only allows
            // this exact role='owner'+status='active' combination for the group's real
            // owner_id, so this always resolves as an immediate active member, not a
            // pending request needing self-approval.
            const { error: memberError } = await client.from('group_members').insert({
                group_id: group.id,
                user_id: myProfile.id,
                username: myProfile.username,
                role: 'owner',
                status: 'active',
                last_active_at: new Date().toISOString()
            });
            if (memberError) throw memberError;
            return { data: group };
        } catch (e) {
            console.error('Failed to create group:', e);
            return { error: 'Không thể tạo group lúc này. Bảng "groups" có thể chưa được tạo trên Supabase.' };
        }
    }

    async function searchGroups(query, limit = 30) {
        if (!client) return [];
        try {
            let q = client.from('groups').select('*').order('vibrancy_score', { ascending: false }).limit(limit);
            if (query) q = q.ilike('name', `%${query.trim()}%`);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to search groups:', e);
            return [];
        }
    }

    async function getGroupById(groupId) {
        if (!client || !groupId) return null;
        try {
            const { data, error } = await client.from('groups').select('*').eq('id', groupId).maybeSingle();
            if (error) throw error;
            return data || null;
        } catch (e) {
            console.error('Failed to fetch group by id:', e);
            return null;
        }
    }

    async function updateGroupAvatar(groupId, avatarUrl) {
        if (!client || !groupId) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('groups').update({ avatar_url: avatarUrl }).eq('id', groupId);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to update group avatar:', e);
            return { error: e.message };
        }
    }

    async function searchGroupByName(name) {
        if (!client || !name) return null;
        try {
            const { data, error } = await client.from('groups').select('*').ilike('name', name.trim()).maybeSingle();
            if (error) throw error;
            return data || null;
        } catch (e) {
            console.error('Failed to search group by name:', e);
            return null;
        }
    }

    // Two flat queries rather than a PostgREST embedded join (`select('*, groups(*)')`)
    // - keeps this consistent with every other module in this codebase, which never
    // relies on embedded-resource joins.
    async function getMyGroup(userId) {
        if (!client || !userId) return null;
        try {
            const { data: membership, error: memberError } = await client
                .from('group_members')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active')
                .maybeSingle();
            if (memberError) throw memberError;
            if (!membership) return null;
            const { data: group, error: groupError } = await client
                .from('groups')
                .select('*')
                .eq('id', membership.group_id)
                .maybeSingle();
            if (groupError) throw groupError;
            return { membership, group };
        } catch (e) {
            console.error('Failed to fetch my group:', e);
            return null;
        }
    }

    async function getGroupMembers(groupId) {
        if (!client || !groupId) return [];
        try {
            const { data, error } = await client
                .from('group_members')
                .select('*')
                .eq('group_id', groupId)
                .eq('status', 'active');
            if (error) throw error;
            const roleOrder = { owner: 0, admin: 1, member: 2 };
            return (data || []).sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3));
        } catch (e) {
            console.error('Failed to fetch group members:', e);
            return [];
        }
    }

    // Only visible to that group's own owner/admin - group_members_select_pending_by_admin
    // RLS hides pending rows from everyone else, so this simply returns [] for a
    // non-admin caller rather than needing a client-side role check first.
    async function getPendingJoinRequests(groupId) {
        if (!client || !groupId) return [];
        try {
            const { data, error } = await client
                .from('group_members')
                .select('*')
                .eq('group_id', groupId)
                .eq('status', 'pending')
                .order('joined_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch pending join requests:', e);
            return [];
        }
    }

    async function requestJoin(myProfile, groupId) {
        if (!client || !myProfile || !groupId) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('group_members').insert({
                group_id: groupId,
                user_id: myProfile.id,
                username: myProfile.username,
                role: 'member',
                status: 'pending'
            });
            if (error) {
                if (error.code === '23505') return { error: 'Bạn đã ở trong group này hoặc đã gửi yêu cầu rồi.' };
                throw error;
            }
            return {};
        } catch (e) {
            console.error('Failed to request to join group:', e);
            return { error: 'Không thể gửi yêu cầu tham gia lúc này.' };
        }
    }

    async function approveJoinRequest(memberRowId, groupId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const members = await getGroupMembers(groupId);
            if (members.length >= MAX_MEMBERS) return { error: `Group đã đủ ${MAX_MEMBERS} thành viên.` };
            const { error } = await client
                .from('group_members')
                .update({ status: 'active', last_active_at: new Date().toISOString() })
                .eq('id', memberRowId);
            if (error) throw error;
            // "Số lượng thành viên" contribution to vibrancy - a one-time bonus per new
            // member rather than a recurring multiplier, so it never needs recomputing.
            // Called by the approver (owner/admin, already an active member), which
            // satisfies increment_group_vibrancy()'s own membership check.
            await client.rpc('increment_group_vibrancy', { p_group_id: groupId, p_amount: 20 }).catch(() => {});
            return {};
        } catch (e) {
            console.error('Failed to approve join request:', e);
            return { error: e.message };
        }
    }

    async function declineJoinRequest(memberRowId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('group_members').delete().eq('id', memberRowId);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to decline join request:', e);
            return { error: e.message };
        }
    }

    // Same DELETE either way - group_members_delete_self_or_admin's RLS allows a member
    // to remove their OWN row (leaving) or an owner/admin to remove ANYONE's (kicking),
    // so this one function covers both call sites.
    async function removeMember(memberRowId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('group_members').delete().eq('id', memberRowId);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to remove member:', e);
            return { error: e.message };
        }
    }

    async function promoteToAdmin(memberRowId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('group_members').update({ role: 'admin' }).eq('id', memberRowId);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to promote member:', e);
            return { error: e.message };
        }
    }

    async function demoteToMember(memberRowId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('group_members').update({ role: 'member' }).eq('id', memberRowId);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to demote member:', e);
            return { error: e.message };
        }
    }

    // ===================== Group chat (mirrors global-chat.js) =====================

    async function getGroupMessages(groupId, limit = 50) {
        if (!client || !groupId) return [];
        try {
            const { data, error } = await client
                .from('group_messages')
                .select('*')
                .eq('group_id', groupId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return (data || []).reverse();
        } catch (e) {
            console.error('Failed to fetch group messages:', e);
            return [];
        }
    }

    async function sendGroupMessage(groupId, myProfile, text) {
        if (!client || !myProfile || !groupId) return { error: 'Chưa cấu hình.' };
        const trimmed = (text || '').trim();
        if (!trimmed) return { error: 'Vui lòng nhập tin nhắn.' };
        if (trimmed.length > MAX_MESSAGE_LENGTH) return { error: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự).` };
        try {
            const { data, error } = await client.from('group_messages').insert({
                group_id: groupId,
                sender_id: myProfile.id,
                sender_username: myProfile.username,
                message: trimmed
            }).select().single();
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to send group message:', e);
            return { error: 'Không thể gửi tin nhắn lúc này. Bảng "group_messages" có thể chưa được tạo trên Supabase.' };
        }
    }

    // channelKey mirrors the exact pattern already fixed in global-chat.js/inbox.js this
    // session - a chat widget subscription and a session-wide notification watcher for
    // the SAME group must use distinct channel names, or the second .channel(...).on(...)
    // call throws "cannot add callbacks after subscribe()".
    function subscribeToGroupMessages(groupId, onNew, channelKey = 'widget') {
        if (!client || !groupId) return () => {};
        const channel = client
            .channel('group-chat:' + groupId + ':' + channelKey)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'group_messages', filter: 'group_id=eq.' + groupId },
                (payload) => onNew(payload.new))
            .subscribe();
        return () => client.removeChannel(channel);
    }

    // ===================== Group leaderboards =====================

    async function getGroupLeaderboard(sortBy = 'vibrancy_score', limit = 20) {
        if (!client) return [];
        const validSorts = ['vibrancy_score', 'battle_wins', 'battles_initiated'];
        const column = validSorts.includes(sortBy) ? sortBy : 'vibrancy_score';
        try {
            const { data, error } = await client
                .from('groups')
                .select('*')
                .order(column, { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch group leaderboard:', e);
            return [];
        }
    }

    // ===================== Group battles =====================

    async function challengeGroupBattle(myGroupId, targetGroupName) {
        if (!client || !myGroupId || !targetGroupName) return { error: 'Chưa cấu hình.' };
        try {
            const target = await searchGroupByName(targetGroupName);
            if (!target) return { error: 'Không tìm thấy group này.' };
            if (target.id === myGroupId) return { error: 'Không thể tự thách đấu group của chính mình.' };
            const { data, error } = await client.from('group_battles').insert({
                group_a_id: myGroupId,
                group_b_id: target.id,
                initiated_by_group_id: myGroupId
            }).select().single();
            if (error) throw error;
            // "Máu chiến" counter - counts every battle a group STARTS regardless of
            // outcome. Caller here is always owner/admin (RLS-enforced by
            // group_battles_insert_by_admin), who already has groups_update_by_admin
            // UPDATE access, so a plain read-then-write is fine (no RPC needed) - this
            // is a rare, deliberate, single-actor action, not a high-frequency
            // concurrent write like the heartbeat.
            const { data: groupRow } = await client.from('groups').select('battles_initiated').eq('id', myGroupId).single();
            if (groupRow) {
                await client.from('groups').update({ battles_initiated: (groupRow.battles_initiated || 0) + 1 }).eq('id', myGroupId);
            }
            return { data };
        } catch (e) {
            console.error('Failed to create group battle challenge:', e);
            return { error: 'Không thể gửi thách đấu group lúc này.' };
        }
    }

    async function getPendingBattlesFor(groupId) {
        if (!client || !groupId) return [];
        try {
            const { data, error } = await client
                .from('group_battles')
                .select('*')
                .eq('group_b_id', groupId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch pending group battles:', e);
            return [];
        }
    }

    async function getActiveBattleFor(groupId) {
        if (!client || !groupId) return null;
        try {
            const { data, error } = await client
                .from('group_battles')
                .select('*')
                .or(`group_a_id.eq.${groupId},group_b_id.eq.${groupId}`)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .maybeSingle();
            if (error) throw error;
            return data || null;
        } catch (e) {
            console.error('Failed to fetch active group battle:', e);
            return null;
        }
    }

    async function acceptGroupBattle(battleId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { data, error } = await client
                .from('group_battles')
                .update({ status: 'active' })
                .eq('id', battleId)
                .select()
                .single();
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to accept group battle:', e);
            return { error: e.message };
        }
    }

    async function declineGroupBattle(battleId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('group_battles').delete().eq('id', battleId);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to decline group battle:', e);
            return { error: e.message };
        }
    }

    async function getBattleDuels(battleId) {
        if (!client || !battleId) return [];
        try {
            const { data, error } = await client
                .from('duels')
                .select('*')
                .eq('group_battle_id', battleId);
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch battle duels:', e);
            return [];
        }
    }

    // Opportunistic recompute (no cron) - called by whichever client happens to be
    // viewing the battle screen when a linked 1v1 duel finishes (see app.js's
    // renderDuelResult() hook). Any active member of either side can write this update
    // (group_battles_update_members RLS), so recomputing is safe even if two clients
    // race to do it near-simultaneously - both just write the same correct tally.
    async function recomputeBattleScore(battleId) {
        if (!client || !battleId) return null;
        try {
            const battle = await client.from('group_battles').select('*').eq('id', battleId).single();
            if (battle.error || !battle.data || battle.data.status !== 'active') return battle.data || null;
            const duels = await getBattleDuels(battleId);
            let aWins = 0, bWins = 0;
            duels.forEach(d => {
                if (d.status !== 'finished' || !d.winner_id) return;
                if (d.group_side === 'a') aWins++;
                else if (d.group_side === 'b') bWins++;
            });
            const { data, error } = await client
                .from('group_battles')
                .update({ group_a_wins: aWins, group_b_wins: bWins })
                .eq('id', battleId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('Failed to recompute group battle score:', e);
            return null;
        }
    }

    // Manual-only resolution (no battle timer/cron) - an owner/admin from either side
    // ends the battle whenever they choose. Winner = whichever side currently has more
    // linked 1v1 wins; a tie leaves winner_group_id null. Vibrancy delta mirrors the
    // individual duel's symmetric wager (DUEL_XP_WAGER in app.js) - same
    // win-gains/loss-costs-the-same-amount spirit, just at group scale.
    //
    // Delegates to the finalize_group_battle() RPC (groups_schema.sql) rather than doing
    // the winner-decide + both-groups-update sequence with plain client calls - the
    // caller here is only ever owner/admin of ONE of the two groups, so a plain
    // `.update()` against the OTHER (losing) group's row would be silently rejected by
    // groups_update_by_admin RLS. The RPC runs as SECURITY DEFINER specifically to reach
    // both groups atomically.
    async function finalizeGroupBattle(battleId) {
        if (!client || !battleId) return { error: 'Chưa cấu hình.' };
        try {
            await recomputeBattleScore(battleId);
            const { data, error } = await client.rpc('finalize_group_battle', { p_battle_id: battleId });
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to finalize group battle:', e);
            return { error: e.message };
        }
    }

    // ===================== Heartbeat (online-time contribution) =====================

    // Called once per login if the user is in a group (see setupGroupHeartbeat() in
    // app.js) - every 60s while the tab is open, credits a small amount of vibrancy to
    // the member's group and refreshes their own last_active_at (used to show "đang
    // online" in the battle screen's member list). Mirrors startEnergyRegeneration()'s
    // interval-based pattern already established for heart regen.
    async function sendHeartbeat(groupId, userId) {
        if (!client || !groupId || !userId) return;
        try {
            await client
                .from('group_members')
                .update({ last_active_at: new Date().toISOString() })
                .eq('group_id', groupId)
                .eq('user_id', userId);
            await client.rpc('increment_group_vibrancy', { p_group_id: groupId, p_amount: 1 });
        } catch (e) {
            console.error('Failed to send group heartbeat:', e);
        }
    }

    // "Chuỗi online của thành viên" contribution - called from updateStreak() in app.js
    // only on the days it actually increments (not every lesson), crediting more for a
    // longer streak.
    async function creditStreakVibrancy(groupId, streak) {
        if (!client || !groupId || !streak) return;
        const amount = Math.min(200, Math.max(1, streak * 2));
        try {
            await client.rpc('increment_group_vibrancy', { p_group_id: groupId, p_amount: amount });
        } catch (e) {
            console.error('Failed to credit streak vibrancy:', e);
        }
    }

    // ===================== Site-admin oversight (groups_admin_schema.sql) =====================
    // Every function below is either a plain SELECT that now sees more rows thanks to the
    // *_select_by_site_admin RLS policies, or a thin wrapper around a SECURITY DEFINER RPC
    // that itself checks is_site_admin(auth.uid()) - the enforcement lives in the RPC, not
    // here, so a non-admin calling these directly gets rejected by Postgres, not just an
    // app that happens to hide the button.

    // Unlike getGroupMembers() (active only), this returns every status/role - relies on
    // group_members_select_by_site_admin to actually see pending rows for groups the
    // caller isn't personally in.
    async function adminGetGroupMembersAll(groupId) {
        if (!client || !groupId) return [];
        try {
            const { data, error } = await client
                .from('group_members')
                .select('*')
                .eq('group_id', groupId)
                .order('joined_at', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch all group members (admin):', e);
            return [];
        }
    }

    // Unlike getPendingBattlesFor()/getActiveBattleFor() (each scoped to one status), this
    // returns every battle involving the group regardless of status, for oversight.
    async function adminGetBattlesFor(groupId) {
        if (!client || !groupId) return [];
        try {
            const { data, error } = await client
                .from('group_battles')
                .select('*')
                .or(`group_a_id.eq.${groupId},group_b_id.eq.${groupId}`)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch all group battles (admin):', e);
            return [];
        }
    }

    async function adminDeleteGroup(groupId) {
        if (!client || !groupId) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.rpc('admin_delete_group', { p_group_id: groupId });
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to delete group (admin):', e);
            return { error: e.message };
        }
    }

    async function adminRemoveMember(memberId) {
        if (!client || !memberId) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.rpc('admin_remove_group_member', { p_member_id: memberId });
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to remove group member (admin):', e);
            return { error: e.message };
        }
    }

    async function adminChangeMemberRole(memberId, newRole) {
        if (!client || !memberId || !newRole) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.rpc('admin_change_member_role', { p_member_id: memberId, p_new_role: newRole });
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to change member role (admin):', e);
            return { error: e.message };
        }
    }

    async function adminSetVibrancy(groupId, newScore) {
        if (!client || !groupId) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.rpc('admin_set_group_vibrancy', { p_group_id: groupId, p_new_score: newScore });
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to set group vibrancy (admin):', e);
            return { error: e.message };
        }
    }

    async function adminDeleteMessage(messageId) {
        if (!client || !messageId) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.rpc('admin_delete_group_message', { p_message_id: messageId });
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to delete group message (admin):', e);
            return { error: e.message };
        }
    }

    async function adminForceFinishBattle(battleId) {
        if (!client || !battleId) return { error: 'Chưa cấu hình.' };
        try {
            const { data, error } = await client.rpc('admin_force_finish_battle', { p_battle_id: battleId });
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to force-finish group battle (admin):', e);
            return { error: e.message };
        }
    }

    window.Groups = {
        isConfigured,
        MAX_MEMBERS,
        createGroup,
        searchGroups,
        getGroupById,
        updateGroupAvatar,
        searchGroupByName,
        getMyGroup,
        getGroupMembers,
        getPendingJoinRequests,
        requestJoin,
        approveJoinRequest,
        declineJoinRequest,
        removeMember,
        promoteToAdmin,
        demoteToMember,
        getGroupMessages,
        sendGroupMessage,
        subscribeToGroupMessages,
        getGroupLeaderboard,
        challengeGroupBattle,
        getPendingBattlesFor,
        getActiveBattleFor,
        acceptGroupBattle,
        declineGroupBattle,
        getBattleDuels,
        recomputeBattleScore,
        finalizeGroupBattle,
        sendHeartbeat,
        creditStreakVibrancy,
        adminGetGroupMembersAll,
        adminGetBattlesFor,
        adminDeleteGroup,
        adminRemoveMember,
        adminChangeMemberRole,
        adminSetVibrancy,
        adminDeleteMessage,
        adminForceFinishBattle
    };
})();
