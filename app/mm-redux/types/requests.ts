// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type RequestStatusOption = 'not_started' | 'started' | 'success' | 'failure' | 'cancelled';
export type RequestStatusType = {
    status: RequestStatusOption;
    error: null | Record<string, any>;
};

export type ChannelsRequestsStatuses = {
    getChannels: RequestStatusType;
    getAllChannels: RequestStatusType;
    myChannels: RequestStatusType;
    createChannel: RequestStatusType;
    updateChannel: RequestStatusType;
};

export type GeneralRequestsStatuses = {
    websocket: RequestStatusType;
};

export type PostsRequestsStatuses = {
    createPost: RequestStatusType;
    editPost: RequestStatusType;
    getPostThread: RequestStatusType;
};

export type TeamsRequestsStatuses = {
    getMyTeams: RequestStatusType;
    getTeams: RequestStatusType;
    joinTeam: RequestStatusType;
};

export type UsersRequestsStatuses = {
    checkMfa: RequestStatusType;
    login: RequestStatusType;
    autocompleteUsers: RequestStatusType;
    updateMe: RequestStatusType;
};

export type EmojisRequestsStatuses = {
    createCustomEmoji: RequestStatusType;
    getCustomEmojis: RequestStatusType;
    deleteCustomEmoji: RequestStatusType;
    getAllCustomEmojis: RequestStatusType;
    getCustomEmoji: RequestStatusType;
};

export type FilesRequestsStatuses = {
    uploadFiles: RequestStatusType;
};

export type RolesRequestsStatuses = {
    getRolesByNames: RequestStatusType;
    getRoleByName: RequestStatusType;
    getRole: RequestStatusType;
    editRole: RequestStatusType;
};

export type JobsRequestsStatuses = {
    createJob: RequestStatusType;
    getJob: RequestStatusType;
    getJobs: RequestStatusType;
    cancelJob: RequestStatusType;
};

export type SearchRequestsStatuses = {
    flaggedPosts: RequestStatusType;
    pinnedPosts: RequestStatusType;
};
