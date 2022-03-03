// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {CustomStatusDuration} from '@app/constants';

export type GQLQuery = {
	errors?: GQLError[];
    user?: Partial<GQLUser>;
    config?: ClientConfig;
    license?: ClientLicense;
    teamMembers: Array<Partial<GQLTeamMembership>>;
    channels?: Array<Partial<GQLChannel>>;
    channelsLeft?: Array<Partial<GQLChannel>>;
    channelMembers?: Array<Partial<GQLChannelMembership>>;
}

export type GQLError = {
	message: string;
	path: Array<string | number>;
}

export type GQLUser = {
    id: string;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	nickname: string;
	isBot: boolean;
	isGuest: boolean;
	isSystemAdmin: boolean;
	createAt: number;
	deleteAt: number;
	authService: string;
	customStatus: Partial<GQLUserCustomStatus>;
	status: Partial<GQLUserStatus>;
	props: UserProps;
	notifyProps: UserNotifyProps;
	lastPictureUpdateAt: number;
	locale: string;
	timezone: UserTimezone;
	position: string;
	roles: Array<Partial<GQLRole>>;
	preferences: Array<Partial<GQLPreference>>;
}

export const gqlToClientUser = (m: Partial<GQLUser>): UserProfile => {
    return {
        auth_service: m.authService || '',
        create_at: m.createAt || 0,
        delete_at: m.deleteAt || 0,
        email: m.email || '',
        first_name: m.firstName || '',
        id: m.id || '',
        is_bot: m.isBot || false,
        last_name: m.lastName || '',
        last_picture_update: m.lastPictureUpdateAt || 0,
        locale: m.locale || '',
        nickname: m.nickname || '',
        notify_props: m.notifyProps!,
        position: m.position || '',
        roles: m.roles?.map((v) => v.name!).join(',') || '',
        update_at: 0,
        username: m.username || '',
        auth_data: '',
        email_verified: true,
        props: m.props,
        status: m.status?.status || '',
        terms_of_service_create_at: 0,
        terms_of_service_id: '',
        timezone: m.timezone,
    };
};

export type GQLTeamMembership = {
    team: Partial<GQLTeam>;
	user: Partial<GQLUser>;
	roles: Array<Partial<GQLRole>>;
	deleteAt: number;
	schemeGuest: boolean;
	schemeUser: boolean;
	schemeAdmin: boolean;
	sidebarCategories: Array<Partial<GQLSidebarCategory>>;
}

export const gqlToClientTeamMembership = (m: Partial<GQLTeamMembership>): TeamMembership => {
    return {
        team_id: m.team?.id || '',
        delete_at: m.deleteAt || 0,
        roles: m.roles?.map((v) => v.name!).join(',') || '',
        user_id: m.user?.id || '',
        scheme_admin: m.schemeAdmin || false,
        scheme_user: m.schemeUser || false,
        mention_count: 0,
        msg_count: 0,
    };
};

export type GQLSidebarCategory = {
    id: string;
	sorting: CategorySorting;
	type: CategoryType;
	displayName: string;
	muted: boolean;
	collapsed: boolean;
	channelIds: string[];
}

export const gqlToClientSidebarCategory = (m: Partial<GQLSidebarCategory>, teamId: string): CategoryWithChannels => {
    return {
        channel_ids: m.channelIds || [],
        collapsed: m.collapsed || false,
        display_name: m.displayName || '',
        id: m.id || '',
        muted: m.muted || false,
        sort_order: 0,
        sorting: m.sorting || 'alpha',
        team_id: teamId,
        type: m.type || 'channels',
    };
};

export type GQLTeam = {
    id: string;
	displayName: string;
	name: string;
	description: string;
	email: string;
	type: TeamType;
	companyName: string;
	allowedDomains: string;
	inviteId: string;
}

export const gqlToClientTeam = (m: Partial<GQLTeam>): Team => {
    return {
        allow_open_invite: false,
        allowed_domains: m.allowedDomains || '',
        company_name: m.companyName || '',
        create_at: 0,
        delete_at: 0,
        description: m.description || '',
        display_name: m.displayName || '',
        email: m.email || '',
        group_constrained: false,
        id: m.id || '',
        invite_id: m.inviteId || '',
        last_team_icon_update: 0,
        name: m.name || '',
        scheme_id: '',
        type: m.type || 'I',
        update_at: 0,
    };
};

export type GQLUserCustomStatus = {
    emoji: string;
	text: string;
	duration: CustomStatusDuration;
	expiresAt: string;
}

export type GQLUserStatus = {
    status: string;
	manual: boolean;
	lastActivityAt: number;
	activeChannel: string;
	dndEndTime: number;
}

export type GQLPreference = {
    userId: string;
	category: string;
	name: string;
	value: string;
}

export const gqlToClientPreference = (m: Partial<GQLPreference>): PreferenceType => {
    return {
        category: m.category || '',
        name: m.name || '',
        user_id: m.userId || '',
        value: m.value || '',
    };
};

export type GQLChannelMembership = {
    channel: GQLChannel;
	user: GQLUser;
	roles: GQLRole[];
	lastViewedAt: number;
	msgCount: number;
	mentionCount: number;
	mentionCountRoot: number;
	notifyProps: ChannelNotifyProps;
	lastUpdateAt: number;
	schemeGuest: boolean;
	schemeUser: boolean;
	schemeAdmin: boolean;
	explicitRoles: string;
	cursor: string;
}

export const gqlToClientChannelMembership = (m: Partial<GQLChannelMembership>): ChannelMembership => {
    return {
        channel_id: m.channel?.id || '',
        last_update_at: m.lastUpdateAt || 0,
        last_viewed_at: m.lastViewedAt || 0,
        mention_count: m.mentionCount || 0,
        msg_count: m.msgCount || 0,
        notify_props: m.notifyProps || {},
        roles: m.roles?.map((r) => r.name).join(',') || '',
        user_id: m.user?.id || '',
        is_unread: false,
        last_post_at: 0,
        post_root_id: '',
        scheme_admin: m.schemeAdmin,
        scheme_user: m.schemeUser,
    };
};

export type GQLChannel = {
    id: string;
	createAt: number;
	updateAt: number;
	deleteAt: number;
	type: ChannelType;
	displayName: string;
	prettyDisplayName: string;
	name: string;
	header: string;
	purpose: string;
	creatorId: string;
	schemeId: string;
	team: Partial<GQLTeam>;
	cursor: string;
}

export const gqlToClientChannel = (m: Partial<GQLChannel>): Channel => {
    return {
        create_at: m.createAt || 0,
        creator_id: m.creatorId || '',
        delete_at: m.deleteAt || 0,
        display_name: m.displayName || '',
        extra_update_at: 0,
        group_constrained: false,
        header: m.header || '',
        id: m.id || '',
        last_post_at: 0,
        name: m.name || '',
        purpose: m.purpose || '',
        scheme_id: m.schemeId || '',
        shared: false,
        team_id: m.team?.id || '',
        total_msg_count: 0,
        type: m.type || 'O',
        update_at: m.updateAt || 0,
        fake: false,
        isCurrent: false,
        status: '',
        teammate_id: '',
    };
};

export type GQLRole = {
    id: string;
	name: string;
	permissions: string[];
	schemeManaged: boolean;
	builtIn: boolean;
}

export const gqlToClientRole = (m: Partial<GQLRole>): Role => {
    return {
        id: m.id || '',
        name: m.name || '',
        permissions: m.permissions || [],
        built_in: m.builtIn,
        scheme_managed: m.schemeManaged,
    };
};
