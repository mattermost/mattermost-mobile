// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {RequiredPlugin} from './types';

export const LOG_PREFIX = '[provision]';

export const GITHUB_AGENTS_RELEASES_API = 'https://api.github.com/repos/mattermost/mattermost-plugin-agents/releases';

export const AGENTS_PLUGIN_ID = 'mattermost-ai';
export const E2E_AGENT_USERNAME = 'ai-bot';
export const LOADTEST_MOCK_MIN_MM_VERSION = '11.8.0';
export const E2E_MOCK_SERVICE_ID = 'e2e-mock-svc-001';

export const PLUGIN_STATE_RUNNING = 2;
export const PLUGIN_STATE_FAILED = 3;

export const CALLS_PLUGIN_URL = 'https://github.com/mattermost/mattermost-plugin-calls/releases/download/v1.11.5/mattermost-plugin-calls-v1.11.5-linux-amd64.tar.gz';

export const DEMO_PLUGIN_ID = 'com.mattermost.demo-plugin';
export const DEMO_PLUGIN_DOWNLOAD_URL = 'https://github.com/mattermost/mattermost-plugin-demo/releases/download/v0.11.1/mattermost-plugin-demo-v0.11.1-linux-amd64.tar.gz';
export const DEMO_PLUGIN_FIXTURE_FILENAME = 'mattermost-plugin-demo-v0.11.1-linux-amd64.tar.gz';

export const REQUIRED_PLUGINS: RequiredPlugin[] = [
    {id: AGENTS_PLUGIN_ID, url: null, fixture: null},
    {id: 'com.mattermost.calls', url: CALLS_PLUGIN_URL, fixture: null},
    {id: DEMO_PLUGIN_ID, url: DEMO_PLUGIN_DOWNLOAD_URL, fixture: DEMO_PLUGIN_FIXTURE_FILENAME},
];

export const ALLOWED_DOMAIN_PATTERNS = [
    /\.cloud\.mattermost\.com$/,
    /\.test\.mattermost\.cloud$/,
    /\.mattermost\.com$/,
    /\.mattermost\.cloud$/,
];
