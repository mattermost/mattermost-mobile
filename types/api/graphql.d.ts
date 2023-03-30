// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type GQLResponse = {
    errors?: GQLError[];
    data: GQLData;
}

type GQLData = {
    user?: Partial<GQLUser>;
    config?: ClientConfig;
    license?: ClientLicense;
    teamMembers: Array<Partial<GQLTeamMembership>>;
    channels?: Array<Partial<GQLChannel>>;
    channelsLeft?: Array<Partial<GQLChannel>>;
    channelMembers?: Array<Partial<GQLChannelMembership>>;
    sidebarCategories?: Array<Partial<GQLSidebarCategory>>;
}

type GQLError = {
	message: string;
	path: Array<string | number>;
}

type GQLUser = {
    id: string;
	createAt: number;
	updateAt: number;
	deleteAt: number;
	username: string;
	authService: string;
	email: string;
	emailVerified: boolean;
	nickname: string;
	firstName: string;
	lastName: string;
	position: string;
	locale: string;
	notifyProps: UserNotifyProps;
	props: UserProps;
	timezone: UserTimezone;
	isBot: boolean;
	lastPictureUpdate: number;
	remoteId: string;
	botDescription: string;
	botLastIconUpdate: number;
	termsOfServiceId: string;
	termsOfServiceCreateAt: number;

	roles: Array<Partial<GQLRole>>;
	customStatus: Partial<GQLUserCustomStatus>;
	status: Partial<GQLUserStatus>;
	preferences: Array<Partial<GQLPreference>>;
    sessions: Array<Partial<GQLSession>>;

	// Derived
	isSystemAdmin: boolean;
	isGuest: boolean;
}

type GQLSession = {
    createAt: number;
    expiresAt: number;
}

type GQLTeamMembership = {
    team: Partial<GQLTeam>;
	user: Partial<GQLUser>;
	roles: Array<Partial<GQLRole>>;
	deleteAt: number;
	schemeGuest: boolean;
	schemeUser: boolean;
	schemeAdmin: boolean;
}

type GQLSidebarCategory = {
    id: string;
	sorting: CategorySorting;
	type: CategoryType;
	displayName: string;
	muted: boolean;
	collapsed: boolean;
	channelIds: string[];
    sortOrder: number;
    teamId: string;
}

type GQLTeam = {
    id: string;
	displayName: string;
	name: string;
	description: string;
	email: string;
	type: TeamType;
	companyName: string;
	allowedDomains: string;
	inviteId: string;
    lastTeamIconUpdate: number;
    groupConstrained: boolean;
    allowOpenInvite: boolean;
    updateAt: number;
    createAt: number;
    deleteAt: number;
    schemeId: string;
    policyId: string;
    cloudLimitsArchived: boolean;
}

type GQLUserCustomStatus = {
    emoji: string;
	text: string;
	duration: CustomStatusDuration;
	expiresAt: string;
}

type GQLUserStatus = {
    status: string;
	manual: boolean;
	lastActivityAt: number;
	activeChannel: string;
	dndEndTime: number;
}

type GQLPreference = {
    userId: string;
	category: string;
	name: string;
	value: string;
}

type GQLChannelMembership = {
    channel: Partial<GQLChannel>;
	user: Partial<GQLUser>;
	roles: Array<Partial<GQLRole>>;
	lastViewedAt: number;
	msgCount: number;
    msgCountRoot: number;
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

type GQLChannel = {
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
    groupConstrained: boolean;
    shared: boolean;
    lastPostAt: number;
    lastRootPostAt: number;
    totalMsgCount: number;
    totalMsgCountRoot: number;
    stats: Partial<GQLStats>;
}

type GQLStats = {
    guestCount: number;
    memberCount: number;
    pinnePostCount: number;
    filesCount: number;
}

type GQLRole = {
    id: string;
	name: string;
	permissions: string[];
	schemeManaged: boolean;
	builtIn: boolean;
}
