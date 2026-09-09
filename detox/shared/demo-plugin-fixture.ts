// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

/**
 * The Mattermost origin must never download this plugin (install_from_url).
 * Cloudflare in front of test servers 524s while the origin waits on GitHub,
 * which then takes down config/patch and file-upload for the rest of the shard.
 * CI and local fetch the tarball onto the runner, then multipart-upload it.
 */
export const DEMO_PLUGIN_ID = 'com.mattermost.demo-plugin';
export const DEMO_PLUGIN_VERSION = '0.11.1';
export const DEMO_PLUGIN_FIXTURE_FILENAME = `mattermost-plugin-demo-v${DEMO_PLUGIN_VERSION}-linux-amd64.tar.gz`;
export const DEMO_PLUGIN_DOWNLOAD_URL =
    `https://github.com/mattermost/mattermost-plugin-demo/releases/download/v${DEMO_PLUGIN_VERSION}/${DEMO_PLUGIN_FIXTURE_FILENAME}`;

const MIN_FIXTURE_BYTES = 10_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const DOWNLOAD_ATTEMPTS = 4;

export const demoPluginFixturePath = (): string => {
    const candidates = [
        path.resolve(__dirname, '../e2e/support/fixtures'),
        path.resolve(process.cwd(), 'e2e/support/fixtures'),
        path.resolve(process.cwd(), 'detox/e2e/support/fixtures'),
    ];
    const fallback = path.resolve(__dirname, '../e2e/support/fixtures');
    const fixturesDir = candidates.find((dir) => fs.existsSync(dir)) ?? fallback;
    return path.join(fixturesDir, DEMO_PLUGIN_FIXTURE_FILENAME);
};

export type DemoPluginStatus = {
    isActive?: boolean;
    isInstalled?: boolean;
};

export type DemoPluginPlan = 'noop' | 'enable' | 'upload-fixture';

export const demoPluginInstallPlan = (status: DemoPluginStatus): DemoPluginPlan => {
    if (status.isActive) {
        return 'noop';
    }
    if (status.isInstalled) {
        return 'enable';
    }
    return 'upload-fixture';
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadToFile = (url: string, dest: string, redirects = 0): Promise<void> =>
    new Promise((resolve, reject) => {
        if (redirects > 5) {
            reject(new Error(`Too many redirects fetching demo plugin from ${url}`));
            return;
        }

        const req = https.get(url, {headers: {'User-Agent': 'mattermost-mobile-e2e'}}, (res) => {
            const location = res.headers.location;
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && location) {
                res.resume();
                downloadToFile(location, dest, redirects + 1).then(resolve, reject);
                return;
            }

            if (!res.statusCode || res.statusCode >= 400) {
                res.resume();
                reject(new Error(`GET ${url} HTTP ${res.statusCode}`));
                return;
            }

            const tmp = `${dest}.partial`;
            const out = fs.createWriteStream(tmp);
            res.pipe(out);
            out.on('finish', () => {
                out.close();
                fs.renameSync(tmp, dest);
                resolve();
            });
            out.on('error', (err) => {
                fs.rmSync(tmp, {force: true});
                reject(err);
            });
        });

        req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
            req.destroy();
            reject(new Error(`Timed out fetching demo plugin from ${url}`));
        });
        req.on('error', reject);
    });

export const ensureDemoPluginFixture = async (): Promise<string> => {
    const dest = demoPluginFixturePath();
    fs.mkdirSync(path.dirname(dest), {recursive: true});

    if (fs.existsSync(dest) && fs.statSync(dest).size >= MIN_FIXTURE_BYTES) {
        return dest;
    }

    fs.rmSync(dest, {force: true});
    fs.rmSync(`${dest}.partial`, {force: true});

    let lastError: unknown;
    /* eslint-disable no-await-in-loop -- runner-side GitHub fetch; sequential retries */
    for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt++) {
        try {
            await downloadToFile(DEMO_PLUGIN_DOWNLOAD_URL, dest);
            if (fs.existsSync(dest) && fs.statSync(dest).size >= MIN_FIXTURE_BYTES) {
                return dest;
            }
            lastError = new Error(`Downloaded demo plugin was too small (${fs.existsSync(dest) ? fs.statSync(dest).size : 0} bytes)`);
        } catch (err) {
            lastError = err;
        }

        fs.rmSync(dest, {force: true});
        fs.rmSync(`${dest}.partial`, {force: true});
        if (attempt < DOWNLOAD_ATTEMPTS) {
            await wait(attempt * 2000);
        }
    }
    /* eslint-enable no-await-in-loop */

    const detail = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
        `Could not fetch ${DEMO_PLUGIN_FIXTURE_FILENAME} onto the runner (${detail}). ` +
        'Do not install_from_url — that path 524s behind Cloudflare. Retry or run detox provision.',
    );
};
