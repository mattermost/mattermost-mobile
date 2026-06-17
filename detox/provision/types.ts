// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiResponse<T = unknown> = {
    data: T;
    status: number;
    headers: Record<string, string | string[] | undefined>;
};

export type GitHubReleaseAsset = {
    name: string;
    browser_download_url: string;
};

export type GitHubRelease = {
    tag_name: string;
    assets?: GitHubReleaseAsset[];
};

export type PluginReleaseCandidate = {
    tag: string;
    url: string;
};

export type PluginInstallResult = {
    ok: boolean;
    status?: number;
    message?: string;
};

export type PluginListEntry = {
    id: string;
    version?: string;
};

export type PluginsPayload = {
    active?: PluginListEntry[];
    inactive?: PluginListEntry[];
};

export type PluginStatus = {
    plugin_id: string;
    state: number;
    error?: string;
    version?: string;
};

export type AgentsPluginService = {
    id: string;
    name: string;
    type: string;
};

export type AgentsPluginAgent = {
    id: string;
    name: string;
};

export type RequiredPlugin = {
    id: string;
    url: string | null;
    fixture?: string | null;
};

export type ProvisionCredentials = {
    username: string;
    password: string;
};

export type MattermostClient = {
    serverUrl: string;
    request: <T = unknown>(method: HttpMethod, path: string, body?: unknown, token?: string) => Promise<ApiResponse<T>>;
};
