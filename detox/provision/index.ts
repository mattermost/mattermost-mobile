// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/** Provisions E2E servers: `<url>` (full), `--baseline-only <url>`, or `--verify <url>...` (JSON on stdout). */

import {type BaselineReport, verifyBaseline} from '../shared/server-baseline';

import {readCredentialsFromEnv} from './env';
import {createMattermostClient, login} from './http-client';
import {logError} from './log';
import {provisionServer} from './provision';
import {applyProvisionBaseline, createBaselineTransport, getServerMmVersion, verifyProvisionBaseline} from './server-config';
import {validateServerUrl} from './validate-url';

import type {ProvisionCredentials} from './types';

type VerifyResult = {serverUrl: string; ok: boolean; report?: BaselineReport; error?: string};

const USAGE = [
    'Usage:',
    '  npx tsx provision/index.ts <server_url>',
    '  npx tsx provision/index.ts --baseline-only <server_url>',
    '  npx tsx provision/index.ts --verify <server_url> [<server_url>...]',
].join('\n');

function usageAndExit(): never {
    logError(USAGE);
    process.exit(1);
}

async function provisionBaselineOnly(serverUrl: string, credentials: ProvisionCredentials): Promise<void> {
    const client = createMattermostClient(serverUrl);
    const token = await login(client, credentials);
    const serverMmVersion = await getServerMmVersion(client, token);
    await applyProvisionBaseline(client, token, serverUrl, serverMmVersion);
    await verifyProvisionBaseline(client, token, serverUrl);
}

async function verifyServer(serverUrl: string, credentials: ProvisionCredentials): Promise<VerifyResult> {
    try {
        const client = createMattermostClient(serverUrl);
        const token = await login(client, credentials);
        const report = await verifyBaseline(createBaselineTransport(client, token), {serverUrl});
        return {serverUrl, ok: report.ok, report};
    } catch (error) {
        return {serverUrl, ok: false, error: error instanceof Error ? error.message : String(error)};
    }
}

async function runVerify(serverUrls: string[], credentials: ProvisionCredentials): Promise<boolean> {
    const results: VerifyResult[] = [];
    for (const serverUrl of serverUrls) {
        // eslint-disable-next-line no-await-in-loop -- one login per server, reported in order
        results.push(await verifyServer(serverUrl, credentials));
    }

    const ok = results.every((result) => result.ok);
    process.stdout.write(`${JSON.stringify({ok, servers: results}, null, 2)}\n`);
    return ok;
}

async function main(): Promise<void> {
    const [command, ...args] = process.argv.slice(2);
    if (!command) {
        usageAndExit();
    }

    if (command === '--verify') {
        if (args.length === 0) {
            usageAndExit();
        }
        args.forEach(validateServerUrl);
        const ok = await runVerify(args, readCredentialsFromEnv());
        process.exitCode = ok ? 0 : 1;
        return;
    }

    if (command === '--baseline-only') {
        const serverUrl = args[0];
        if (!serverUrl) {
            usageAndExit();
        }
        validateServerUrl(serverUrl);
        await provisionBaselineOnly(serverUrl, readCredentialsFromEnv());
        return;
    }

    validateServerUrl(command);
    await provisionServer(command, readCredentialsFromEnv());
}

main().catch((err: Error) => {
    logError(`Fatal error: ${err.message}`);
    process.exit(1);
});
