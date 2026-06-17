// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import https from 'node:https';

import {GITHUB_AGENTS_RELEASES_API, LOADTEST_MOCK_MIN_MM_VERSION} from './constants';
import {getAgentsPluginDownloadUrl} from './env';
import {logInfo} from './log';
import {compareReleaseTagsDesc, semverGte} from './semver';

import type {GitHubRelease, GitHubReleaseAsset, PluginReleaseCandidate} from './types';

function externalGet<T>(url: string): Promise<{status: number; data: T}> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'mattermost-mobile-provision',
                Accept: 'application/vnd.github+json',
            },
            timeout: 30_000,
        }, (res) => {
            let data = '';
            res.on('data', (chunk: string) => {
                data += chunk;
            });
            res.on('end', () => {
                if (!data) {
                    resolve({status: res.statusCode || 0, data: {} as T});
                    return;
                }
                try {
                    resolve({status: res.statusCode || 0, data: JSON.parse(data) as T});
                } catch {
                    reject(new Error(`Failed to parse JSON response from ${url} (HTTP ${res.statusCode || 0})`));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request to ${url} timed out`));
        });
    });
}

export function pickLinuxTarAsset(release: GitHubRelease): GitHubReleaseAsset | null {
    const assets = release.assets || [];
    const candidates = assets.filter((asset) => (
        asset.name.endsWith('.tar.gz') &&
        !asset.name.endsWith('.tar.gz.asc') &&
        !asset.name.endsWith('.tar.gz.sig') &&
        !asset.name.includes('darwin') &&
        !asset.name.includes('windows')
    ));

    return (
        candidates.find((asset) => asset.name.includes('linux-amd64')) ||
        candidates.find((asset) => asset.name.startsWith('mattermost-ai-')) ||
        candidates.find((asset) => asset.name.includes('latest-fips')) ||
        candidates.find((asset) => /mattermost-plugin-agents-v\d+\.\d+\.\d+\.tar\.gz$/.test(asset.name)) ||
        candidates[0] ||
        null
    );
}

export async function fetchAgentsPluginReleases(): Promise<GitHubRelease[]> {
    const releases: GitHubRelease[] = [];
    /* eslint-disable no-await-in-loop -- GitHub pagination: each page request depends on the previous response */
    for (let page = 1; page <= 3; page++) {
        const res = await externalGet<GitHubRelease[]>(`${GITHUB_AGENTS_RELEASES_API}?per_page=50&page=${page}`);
        if (!Array.isArray(res.data) || res.data.length === 0) {
            break;
        }
        releases.push(...res.data);
        if (res.data.length < 50) {
            break;
        }
    }
    /* eslint-enable no-await-in-loop */
    return releases;
}

export function buildAgentsReleaseCandidates(releases: GitHubRelease[], serverMmVersion: string): PluginReleaseCandidate[] {
    const candidates: PluginReleaseCandidate[] = [];

    if (semverGte(serverMmVersion, LOADTEST_MOCK_MIN_MM_VERSION)) {
        const latestMaster = releases.find((release) => release.tag_name === 'latest-master');
        const masterAsset = latestMaster && pickLinuxTarAsset(latestMaster);
        if (masterAsset) {
            candidates.push({tag: 'latest-master', url: masterAsset.browser_download_url});
        }
    }

    const versionedReleases = releases.
        filter((release) => /^v\d+\.\d+\.\d+$/.test(release.tag_name)).
        sort((a, b) => compareReleaseTagsDesc(a.tag_name, b.tag_name));

    for (const release of versionedReleases) {
        const asset = pickLinuxTarAsset(release);
        if (asset) {
            candidates.push({tag: release.tag_name, url: asset.browser_download_url});
        }
    }

    return candidates;
}

export async function resolveAgentsPluginCandidates(serverMmVersion: string): Promise<PluginReleaseCandidate[] | string> {
    const pluginDownloadUrl = getAgentsPluginDownloadUrl();
    if (pluginDownloadUrl) {
        logInfo('Using AGENTS_PLUGIN_DOWNLOAD_URL override for mattermost-ai.');
        return pluginDownloadUrl;
    }

    logInfo('Resolving mattermost-ai plugin URL from GitHub releases...');
    const releases = await fetchAgentsPluginReleases();
    const candidates = buildAgentsReleaseCandidates(releases, serverMmVersion);
    if (candidates.length === 0) {
        throw new Error('Could not resolve mattermost-ai plugin download URL from GitHub releases');
    }

    logInfo(`mattermost-ai release candidates: ${candidates.map((c) => c.tag).join(', ')}`);
    return candidates;
}

export async function getLatestMasterPluginUrl(): Promise<string | null> {
    const releases = await fetchAgentsPluginReleases();
    const latestMaster = releases.find((release) => release.tag_name === 'latest-master');
    const asset = latestMaster && pickLinuxTarAsset(latestMaster);
    return asset?.browser_download_url ?? null;
}
