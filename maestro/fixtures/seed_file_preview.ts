#!/usr/bin/env tsx
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env, no-console */

const concatBuffers = (parts: Buffer[]): Buffer => Buffer.concat(parts as unknown as Uint8Array[]);

import fs from 'fs';
import http, {type IncomingMessage, type RequestOptions} from 'http';
import https from 'https';
import path from 'path';

const SITE_1_URL = process.env.SITE_1_URL as string;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME as string;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD as string;
const ENV_FILE = '.maestro-test-env.sh';

if (!SITE_1_URL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error('[seed_file_preview] Error: SITE_1_URL, ADMIN_USERNAME, and ADMIN_PASSWORD are required');
    process.exit(1);
}

const DETOX_FIXTURES = path.join(__dirname, '../../detox/e2e/support/fixtures');

// Minimal valid MP4: ftyp box (24 bytes) + free box (8 bytes).
// The 'ftyp isom' magic causes Mattermost server to return video/mp4 MIME type.
function createMp4Stub(): Buffer {
    return concatBuffers([
        Buffer.from([0x00, 0x00, 0x00, 0x18]), // ftyp box size = 24
        Buffer.from('ftyp'), // box type
        Buffer.from('isom'), // major brand
        Buffer.from([0x00, 0x00, 0x02, 0x00]), // minor version
        Buffer.from('isom'), // compatible brand 1
        Buffer.from('mp41'), // compatible brand 2
        Buffer.from([0x00, 0x00, 0x00, 0x08]), // free box size = 8
        Buffer.from('free'), // box type
    ]);
}

// Minimal valid ZIP: end-of-central-directory record (22 bytes).
// PK\x05\x06 magic → Mattermost returns application/zip MIME type.
// application/zip is NOT in SUPPORTED_DOCS_FORMAT so the app renders a generic file card.
function createZipStub(): Buffer {
    return concatBuffers([
        Buffer.from([0x50, 0x4B, 0x05, 0x06]), // end-of-central-dir signature
        Buffer.alloc(18, 0), // 18 zero bytes (rest of EOCD record)
    ]);
}

interface Fixture {
    key: string;
    content: () => Buffer;
    name: string;
    mime: string;
    description: string;
}

// Files to upload — one per rendering category in the Mattermost mobile app.
const FIXTURES: Fixture[] = [
    {
        key: 'IMAGE',
        content: () => fs.readFileSync(path.join(DETOX_FIXTURES, 'image.png')),
        name: 'preview_image.png',
        mime: 'image/png',
        description: 'Image → opens gallery viewer on tap',
    },
    {
        key: 'VIDEO',
        content: createMp4Stub,
        name: 'preview_video.mp4',
        mime: 'video/mp4',
        description: 'Video → opens gallery video player on tap',
    },
    {
        key: 'AUDIO',
        content: () => fs.readFileSync(path.join(DETOX_FIXTURES, 'audio.mp3')),
        name: 'preview_audio.mp3',
        mime: 'audio/mpeg',
        description: 'Audio → inline audio player (no navigation)',
    },
    {
        key: 'PDF',
        content: () => fs.readFileSync(path.join(DETOX_FIXTURES, 'sample.pdf')),
        name: 'preview_document.pdf',
        mime: 'application/pdf',
        description: 'Document → file card, tap downloads + opens system viewer',
    },
    {
        key: 'ZIP',
        content: createZipStub,
        name: 'preview_archive.zip',
        mime: 'application/zip',
        description: 'Generic → file card (no preview — application/zip not in SUPPORTED_DOCS_FORMAT)',
    },
];

function randomPrefix(): string {
    return Math.random().toString(36).slice(2, 8);
}

function request(method: string, urlPath: string, body: object | null, token?: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = new URL(SITE_1_URL + urlPath);
        const lib = url.protocol === 'https:' ? https : http;
        const payload = body ? JSON.stringify(body) : null;
        const options: RequestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? {Authorization: `Bearer ${token}`} : {}),
                ...(payload ? {'Content-Length': Buffer.byteLength(payload)} : {}),
            },
        };

        const req = lib.request(options, (res: IncomingMessage) => {
            let data = '';
            res.on('data', (chunk: string) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if ((res.statusCode ?? 0) >= 400) {
                        reject(new Error(`[seed_file_preview] HTTP ${res.statusCode} on ${method} ${urlPath}: ${parsed.message || data}`));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error(`[seed_file_preview] Failed to parse response from ${method} ${urlPath}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}

function loginAndGetToken(): Promise<{user: any; token: string}> {
    return new Promise((resolve, reject) => {
        const url = new URL(SITE_1_URL + '/api/v4/users/login');
        const lib = url.protocol === 'https:' ? https : http;
        const loginId = ADMIN_USERNAME;
        const payload = JSON.stringify({login_id: loginId, password: ADMIN_PASSWORD});
        const options: RequestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        };

        const req = lib.request(options, (res: IncomingMessage) => {
            let data = '';
            res.on('data', (chunk: string) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if ((res.statusCode ?? 0) >= 400) {
                        reject(new Error(`[seed_file_preview] Login failed (HTTP ${res.statusCode}): ${parsed.message || data}`));
                        return;
                    }
                    const sessionToken = res.headers.token as string;
                    if (!sessionToken) {
                        reject(new Error('[seed_file_preview] Login succeeded but no session token in response headers'));
                        return;
                    }
                    resolve({user: parsed, token: sessionToken});
                } catch (e) {
                    reject(new Error(`[seed_file_preview] Failed to parse login response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Upload a file via multipart/form-data POST to /api/v4/files.
// Returns the FileInfo object (with .id, .name, .mime_type).
function uploadFile(token: string, channelId: string, fileContent: Buffer, fileName: string, mimeType: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const boundary = `MaestroBoundary${Date.now()}`;
        const body = concatBuffers([
            Buffer.from(
                `--${boundary}\r\n` +
                'Content-Disposition: form-data; name="channel_id"\r\n\r\n' +
                `${channelId}\r\n` +
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="files"; filename="${fileName}"\r\n` +
                `Content-Type: ${mimeType}\r\n\r\n`,
            ),
            fileContent,
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        const url = new URL(`${SITE_1_URL}/api/v4/files`);
        const lib = url.protocol === 'https:' ? https : http;
        const options: RequestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length,
                Authorization: `Bearer ${token}`,
            },
        };

        const req = lib.request(options, (res: IncomingMessage) => {
            let data = '';
            res.on('data', (chunk: string) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if ((res.statusCode ?? 0) >= 400) {
                        reject(new Error(`[seed_file_preview] Upload failed HTTP ${res.statusCode}: ${parsed.message || data}`));
                    } else {
                        resolve(parsed.file_infos[0]);
                    }
                } catch (e) {
                    reject(new Error(`[seed_file_preview] Failed to parse upload response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function writeEnvFile(vars: Record<string, string>): void {
    const lines = Object.entries(vars).
        map(([k, v]) => `export ${k}="${v}"`).
        join('\n');
    fs.writeFileSync(ENV_FILE, `#!/bin/bash\n# Auto-generated by maestro/fixtures/seed_file_preview.ts — do not edit\n${lines}\n`);
    console.log(`[seed_file_preview] Wrote env vars to ${ENV_FILE}`);
}

async function main(): Promise<void> {
    const {user: adminUser, token: adminToken} = await loginAndGetToken();
    console.log(`[seed_file_preview] Admin session obtained (id: ${adminUser.id})`);

    const prefix = randomPrefix();

    // Create isolated team, channel, and test user
    const team = await request('POST', '/api/v4/teams', {
        name: `fp-${prefix}`,
        display_name: `File Preview ${prefix}`,
        type: 'O',
    }, adminToken);
    console.log(`[seed_file_preview] Created team: ${team.name}`);

    const channel = await request('POST', '/api/v4/channels', {
        team_id: team.id,
        name: `fp-${prefix}`,
        display_name: `File Preview ${prefix}`,
        type: 'O',
    }, adminToken);
    console.log(`[seed_file_preview] Created channel: ${channel.name}`);

    const testUser = await request('POST', '/api/v4/users', {
        email: `fp_${prefix}@example.com`,
        username: `fp_${prefix}`,
        password: 'Test1234!',
        first_name: 'File',
        last_name: 'Preview',
    }, adminToken);
    console.log(`[seed_file_preview] Created user: ${testUser.username}`);

    await request('POST', `/api/v4/teams/${team.id}/members`, {team_id: team.id, user_id: adminUser.id}, adminToken);
    await request('POST', `/api/v4/channels/${channel.id}/members`, {user_id: adminUser.id}, adminToken);
    await request('POST', `/api/v4/teams/${team.id}/members`, {team_id: team.id, user_id: testUser.id}, adminToken);
    await request('POST', `/api/v4/channels/${channel.id}/members`, {user_id: testUser.id}, adminToken);

    const fileIds: Record<string, string> = {};
    for (const fixture of FIXTURES) {
        // eslint-disable-next-line no-await-in-loop
        const fileInfo = await uploadFile(adminToken, channel.id, fixture.content(), fixture.name, fixture.mime);
        console.log(`[seed_file_preview] Uploaded ${fixture.name} → file_id: ${fileInfo.id} (${fixture.description})`);

        // eslint-disable-next-line no-await-in-loop
        await request('POST', '/api/v4/posts', {
            channel_id: channel.id,
            message: '',
            file_ids: [fileInfo.id],
        }, adminToken);

        fileIds[fixture.key] = fileInfo.id;
    }

    writeEnvFile({
        SITE_1_URL,
        TEST_TEAM_NAME: team.name,
        TEST_CHANNEL_NAME: channel.name,
        TEST_USER_EMAIL: testUser.email,
        TEST_USER_PASSWORD: 'Test1234!',
        IMAGE_FILE_ID: fileIds.IMAGE,
        VIDEO_FILE_ID: fileIds.VIDEO,
        AUDIO_FILE_ID: fileIds.AUDIO,
        PDF_FILE_ID: fileIds.PDF,
        ZIP_FILE_ID: fileIds.ZIP,
    });

    console.log('[seed_file_preview] Done.');
    console.log('[seed_file_preview] Run the Maestro flow with:');
    console.log(`  source ${ENV_FILE} && maestro test maestro/flows/channels/file_type_preview.yml \\`);
    console.log('    --env TEST_USER_EMAIL=$TEST_USER_EMAIL \\');
    console.log('    --env TEST_USER_PASSWORD=$TEST_USER_PASSWORD \\');
    console.log('    --env TEST_CHANNEL_NAME=$TEST_CHANNEL_NAME \\');
    console.log('    --env IMAGE_FILE_ID=$IMAGE_FILE_ID \\');
    console.log('    --env VIDEO_FILE_ID=$VIDEO_FILE_ID \\');
    console.log('    --env AUDIO_FILE_ID=$AUDIO_FILE_ID \\');
    console.log('    --env PDF_FILE_ID=$PDF_FILE_ID \\');
    console.log('    --env ZIP_FILE_ID=$ZIP_FILE_ID');
}

main().catch((err: Error) => {
    console.error('[seed_file_preview] Fatal error:', err.message);
    process.exit(1);
});
