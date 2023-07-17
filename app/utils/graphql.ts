// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const defaultNotifyProps: UserNotifyProps = {
    channel: 'true',
    comments: 'never',
    desktop: 'mention',
    desktop_sound: 'true',
    email: 'true',
    email_threads: 'all',
    first_name: 'false',
    mention_keys: '',
    push: 'mention',
    push_status: 'away',
    push_threads: 'all',

};
export const gqlToClientUser = (u: Partial<GQLUser>): UserProfile => {
    return {
        id: u.id || '',
        create_at: u.createAt || 0,
        update_at: u.updateAt || 0,
        delete_at: u.deleteAt || 0,
        username: u.username || '',
        auth_service: u.authService || '',

        email: u.email || '',
        email_verified: u.emailVerified ?? true,
        nickname: u.nickname || '',
        first_name: u.firstName || '',
        last_name: u.lastName || '',
        position: u.position || '',
        roles: u.roles?.map((v) => v.name!).join(' ') || '',
        locale: u.locale || '',
        notify_props: u.notifyProps || defaultNotifyProps,
        props: u.props,

        timezone: u.timezone,
        is_bot: u.isBot,
        last_picture_update: u.lastPictureUpdate,
        remote_id: u.remoteId,
        status: u.status?.status || '',
        bot_description: u.botDescription,
        bot_last_icon_update: u.botLastIconUpdate,

        terms_of_service_id: u.termsOfServiceId || '',
        terms_of_service_create_at: u.termsOfServiceCreateAt || 0,

        auth_data: '',
    };
};

export const gqlToClientSession = (s: Partial<GQLSession>): Session => {
    return {
        create_at: s.createAt || 0,
        expires_at: s.expiresAt || 0,
        id: '',
        user_id: '',
    };
};

export const gqlToClientTeamMembership = (m: Partial<GQLTeamMembership>, userId?: string): TeamMembership => {
    return {
        team_id: m.team?.id || '',
        delete_at: m.deleteAt || 0,
        roles: m.roles?.map((v) => v.name!).join(' ') || '',
        user_id: m.user?.id || userId || '',
        scheme_admin: m.schemeAdmin || false,
        scheme_user: m.schemeUser || false,
        mention_count: 0,
        msg_count: 0,
    };
};

export const gqlToClientSidebarCategory = (c: Partial<GQLSidebarCategory>, teamId: string): CategoryWithChannels => {
    return {
        channel_ids: c.channelIds || [],
        collapsed: c.collapsed || false,
        display_name: c.displayName || '',
        id: c.id || '',
        muted: c.muted || false,
        sort_order: c.sortOrder || 0,
        sorting: c.sorting || 'alpha',
        team_id: c.teamId || teamId,
        type: c.type || 'channels',
    };
};

export const gqlToClientTeam = (t: Partial<GQLTeam>): Team => {
    return {
        allow_open_invite: t.allowOpenInvite || false,
        allowed_domains: t.allowedDomains || '',
        company_name: t.companyName || '',
        create_at: t.createAt || 0,
        delete_at: t.deleteAt || 0,
        description: t.description || '',
        display_name: t.displayName || '',
        email: t.email || '',
        group_constrained: t.groupConstrained || false,
        id: t.id || '',
        invite_id: t.inviteId || '',
        last_team_icon_update: t.lastTeamIconUpdate || 0,
        name: t.name || '',
        scheme_id: t.schemeId || '',
        type: t.type || 'I',
        update_at: t.updateAt || 0,

        // cloudLimitsArchived and policyId not used
    };
};

export const gqlToClientPreference = (p: Partial<GQLPreference>): PreferenceType => {
    return {
        category: p.category || '',
        name: p.name || '',
        user_id: p.userId || '',
        value: p.value || '',
    };
};

export const gqlToClientChannelMembership = (m: Partial<GQLChannelMembership>, userId?: string): ChannelMembership => {
    return {
        channel_id: m.channel?.id || '',
        last_update_at: m.lastUpdateAt || 0,
        last_viewed_at: m.lastViewedAt || 0,
        mention_count: m.mentionCount || 0,
        mention_count_root: m.mentionCountRoot || 0,
        msg_count: m.msgCount || 0,
        msg_count_root: m.msgCountRoot || 0,
        notify_props: m.notifyProps || {},
        roles: m.roles?.map((r) => r.name).join(' ') || '',
        user_id: m.user?.id || userId || '',
        is_unread: false,
        last_post_at: 0,
        post_root_id: '',
        scheme_admin: m.schemeAdmin,
        scheme_user: m.schemeUser,
    };
};

export const gqlToClientChannel = (c: Partial<GQLChannel>, teamId?: string): Channel => {
    return {
        create_at: c.createAt || 0,
        creator_id: c.creatorId || '',
        delete_at: c.deleteAt || 0,
        display_name: c.prettyDisplayName || c.displayName || '',
        extra_update_at: 0,
        group_constrained: c.groupConstrained || false,
        header: c.header || '',
        id: c.id || '',
        last_post_at: c.lastPostAt || 0,
        last_root_post_at: c.lastRootPostAt || 0,
        name: c.name || '',
        purpose: c.purpose || '',
        scheme_id: c.schemeId || '',
        shared: c.shared || false,
        team_id: c.team?.id || teamId || '',
        total_msg_count: c.totalMsgCount || 0,
        total_msg_count_root: c.totalMsgCountRoot || 0,
        type: c.type || 'O',
        update_at: c.updateAt || 0,
        fake: false,
        isCurrent: false,
        status: '',
        teammate_id: '',
    };
};

export const gqlToClientChannelStats = (s: Partial<GQLChannel>): ChannelStats => {
    return {
        channel_id: s.id || '',
        guest_count: s.stats?.guestCount || 0,
        member_count: s.stats?.memberCount || 0,
        pinnedpost_count: s.stats?.pinnePostCount || 0,
        files_count: s.stats?.filesCount || 0,
    };
};

export const gqlToClientRole = (r: Partial<GQLRole>): Role => {
    return {
        id: r.id || '',
        name: r.name || '',
        permissions: r.permissions || [],
        built_in: r.builtIn,
        scheme_managed: r.schemeManaged,
    };
};

export const getMemberChannelsFromGQLQuery = (data: GQLData) => {
    return data.channelMembers?.reduce<Channel[]>((acc, m) => {
        if (m.channel) {
            acc.push(gqlToClientChannel(m.channel));
        }
        return acc;
    }, []);
};

export const getMemberTeamsFromGQLQuery = (data: GQLData) => {
    return data.teamMembers?.reduce<Team[]>((acc, m) => {
        if (m.team) {
            acc.push(gqlToClientTeam(m.team));
        }
        return acc;
    }, []);
};

export const filterAndTransformRoles = (roles: Array<Partial<GQLRole> | undefined>) => {
    const byName = roles.reduce<{[name: string]: Partial<GQLRole>}>((acum, r) => {
        if (r?.name && !acum[r.name]) {
            acum[r.name] = r;
        }
        return acum;
    }, {});
    return Object.values(byName).map((r) => gqlToClientRole(r));
};
