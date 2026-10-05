// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    DEMO_PLUGIN_DOWNLOAD_URL,
    DEMO_PLUGIN_FIXTURE_FILENAME,
    DEMO_PLUGIN_ID,
} from '../shared/demo-plugin-fixture';

import type {RequiredPlugin} from './types';

export {DEMO_PLUGIN_DOWNLOAD_URL, DEMO_PLUGIN_FIXTURE_FILENAME, DEMO_PLUGIN_ID};

export const LOG_PREFIX = '[provision]';

export const AGENTS_PLUGIN_ID = 'mattermost-ai';
export const AGENTS_PLUGIN_REPO = 'mattermost/mattermost-plugin-agents';
export const AGENTS_PLUGIN_ASSET_NAME = 'mattermost-plugin-agents';
export const AGENTS_PLUGIN_FALLBACK_VERSION = '1.14.0';

export const PLUGIN_STATE_RUNNING = 2;
export const PLUGIN_STATE_FAILED = 3;

export const CALLS_PLUGIN_URL = 'https://github.com/mattermost/mattermost-plugin-calls/releases/download/v1.11.5/mattermost-plugin-calls-v1.11.5-linux-amd64.tar.gz';

export const REQUIRED_PLUGINS: RequiredPlugin[] = [
    {id: AGENTS_PLUGIN_ID, url: null, fixture: null},
    {id: 'com.mattermost.calls', url: CALLS_PLUGIN_URL, fixture: null},

    // url is null on purpose: origin-side install_from_url 524s behind Cloudflare.
    {id: DEMO_PLUGIN_ID, url: null, fixture: DEMO_PLUGIN_FIXTURE_FILENAME},
];

export const ALLOWED_DOMAIN_PATTERNS = [
    /\.cloud\.mattermost\.com$/,
    /\.test\.mattermost\.cloud$/,
    /\.mattermost\.com$/,
    /\.mattermost\.cloud$/,
];
