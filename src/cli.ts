// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-process-exit */
/* eslint-disable max-nested-callbacks */
/* eslint-disable no-console */
/* eslint-disable no-var */
/* eslint-disable no-empty-function */
/* eslint-disable no-process-env */
/* eslint-disable no-unused-expressions */

import fs from 'node:fs';
import {resolve} from 'node:path';

import {cosmiconfig} from 'cosmiconfig';
import {createCoverageMap} from 'istanbul-lib-coverage';
import {Server, ClientError} from 'mocha-remote-server';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {z} from 'zod';

import {JetConfigSchema} from './types';

const coverageMap = createCoverageMap({});
const jetPackageJsonPath = resolve(__dirname, '../../package.json');
const jetPackageJson = JSON.parse(fs.readFileSync(jetPackageJsonPath, 'utf8'));
const JetBeforeHook = z.
    function().
    args(JetConfigSchema).
    returns(z.union([z.promise(JetConfigSchema), JetConfigSchema]));
const JetAfterHook = z.
    function().
    args(JetConfigSchema).
    returns(z.union([z.promise(z.undefined()), z.undefined()])).
    optional();
const JetRcSchema = z.object({
    config: JetConfigSchema,
    targets: z.record(
        z.object({
            config: JetConfigSchema,
            before: JetBeforeHook,
            after: JetAfterHook,
        }),
    ),
});

async function isMetroRunning(port: string | number = 8081) {
    try {
        const fetchResult = await fetch(`http://localhost:${port}/status`);
        const status = await fetchResult.text();
        return status.includes('packager-status:running');
    } catch (e) {
        return false;
    }
}

function isNumeric(value: string) {
    return (/^-?\d+$/).test(value);
}

function coerceValue(value: string): string | number | boolean {
    if (value.toLowerCase() === 'false') {
        return false;
    } else if (value.toLowerCase() === 'true') {
        return true;
    } else if (isNumeric(value)) {
        return parseFloat(value);
    }
    return value;
}

function parseKeyValues(opts: string[]): { [key: string]: string | true } {
    const pairs = opts.map((value) => value.split(',')).flat();
    const splitPairs = pairs.
        map((pair) => {
            const [key, value] = pair.split('=');
            if (typeof value === 'string' && value.length > 0) {
                return [key, coerceValue(value)];
            }
            return [key, true];
        }).
        filter(([k]) => k !== '');
    return Object.fromEntries(splitPairs);
}

type CleanupTask = () => void | Promise<void>;
const cleanupTasks = new Set<CleanupTask>();
function cleanup() {
    const tasks = [...cleanupTasks];
    cleanupTasks.clear();
    tasks.
        reduce((previous, task) => previous.then(task), Promise.resolve()).
        catch((err) => {
            console.log(`[🟥] Failed to run a cleanup task: ${err.message}`);
        });
}

async function startServer(
    server: Server,
    config: z.infer<typeof JetConfigSchema>,
    after: z.infer<typeof JetAfterHook>,
): Promise<void> {
    server.on('started', (event) => {
        const url = event.url;
        console.log(`[🟩] Jet remote server listening at "${url}".`);
    });

    server.on('connection', (_, req) => {
        console.log(
            `[🟩] Jet client connected from "${req.socket.remoteAddress + ':' + req.socket.remotePort}".`,
        );
    });

    server.on('disconnection', (_, code, reason) => {
        const print = code === 1000 ? console.log : console.warn;
        const msg =
      code === 1000 ? 'normal closure' : reason || 'for no particular reason';
        print(`[🟨] Jet client disconnected - ${msg} (code = ${code}).`);
        if (code !== 1000 && config!.exitOnError) {
            print('[🟥] Exiting after an abnormal disconnect.');
            process.exitCode = 1;
            cleanup();
        }
    });

    server.on('error', (error) => {
        if (error instanceof ClientError) {
            console.error(`[🟥] ${error.message || 'Missing a message'}`);
        } else {
            console.error(`[🟥] ${error.message || 'Missing a message'}`);
        }
        if (config!.exitOnError) {
            process.exitCode = 1;
            cleanup();
        }
    });

    cleanupTasks.add(async () => {
        if (server.listening) {
            await server.stop();
            console.log('[🧹] Stopped the server');
        }
    });

    await server.start();

    const runAfterHook = async () => {
        console.log('[🪝] Running after hook...');
        await after?.(config!);
    };

    cleanupTasks.add(runAfterHook);
    process.on('SIGINT', cleanup);
    process.on('exit', cleanup);
}

function attachHttpServer(wss: any) {
    const server = wss._server;
    if (!server) {
        console.error('No underlying server found in WebSocket server');
        return;
    }
    server.on('request', (req: any, res: any) => {
        if (req.url === '/coverage' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    coverageMap.merge(JSON.parse(body));
                    (global as any).__coverage__ = coverageMap.toJSON();
                    res.end(JSON.stringify({message: 'OK'}));
                } catch (e) {
                    res.end(JSON.stringify({error: 'Invalid JSON'}));
                }
            });
        } else {
            res.writeHead(404, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'Not Found'}));
        }
    });
}

yargs(hideBin(process.argv)).
    scriptName('jet').
    version('version', 'Show version number & exit', jetPackageJson.version).
    alias('v', 'version').
    option('target', {
        description:
      'The name of the test target to run as defined in your "jet" package.json config.',
        type: 'string',
        demandOption: true,
        alias: 'T',
    }).
    option('grep', {
        description: 'Only run tests matching this string or regexp',
        type: 'string',
        default: process.env.JET_REMOTE_GREP,
        alias: 'g',
    }).
    option('coverage', {
        description: 'Run tests with coverage enabled.',
        type: 'boolean',
        default: process.env.JET_COVERAGE === 'true',
        alias: 'C',
    }).
    option('invert', {
        description: 'Inverts --grep matches',
        type: 'boolean',
        default: process.env.JET_REMOTE_INVERT === 'true',
        alias: 'i',
    }).
    option('context', {
        description:
      'Runtime context sent to client when starting a run (<k=v,[k1=v1,..]>)',
        type: 'array',
        alias: 'c',
        default: process.env.JET_REMOTE_CONTEXT || [],
        coerce: parseKeyValues,
    }).
    option('watch', {
        description: 'Keep the server running after a test has ended',
        type: 'boolean',
        default: process.env.JET_REMOTE_WATCH === 'true' || false,
        alias: 'w',
    }).
    option('slow', {
        type: 'number',
        alias: 's',
        description: 'Specify "slow" test threshold (in milliseconds)',
        default: parseInt(process.env.JET_REMOTE_SLOW || '2000', 10),
    }).
    option('hostname', {
        description: 'Network hostname to use when listening for clients',
        default: process.env.JET_REMOTE_HOSTNAME || '0.0.0.0',
        alias: 'H',
    }).
    option('metro-port', {
        description: 'Network port that Metro is running on.',
        default: parseInt(process.env.JET_METRO_PORT || '8081', 10),
        alias: 'M',
    }).
    option('port', {
        description: 'Network port to use when listening for clients',
        default: parseInt(process.env.JET_REMOTE_PORT || '8090', 10),
        alias: 'P',
    }).
    option('timeout', {
        type: 'number',
        alias: ['t', 'timeouts'],
        description: 'Specify test timeout threshold (in milliseconds)',
        default: parseInt(process.env.JET_REMOTE_TIMEOUT || '30000', 10),
    }).
    option('exit-on-error', {
        type: 'boolean',
        description: 'Exit immediately if an error occurs',
        alias: 'e',
        default: process.env.JET_REMOTE_EXIT_ON_ERROR === 'true',
    }).
    option('reporter-option', {
        description: 'Reporter-specific options (<k=v,[k1=v1,..]>)',
        type: 'array',
        default: process.env.JET_REMOTE_REPORTER_OPTIONS || [],
        coerce: parseKeyValues,
        alias: ['O', 'reporter-options'],
    }).
    option('reporter', {
        description: 'Specify reporter to use',
        alias: 'R',
        default: process.env.JET_REMOTE_REPORTER || 'spec',
    }).
    option('context', {
        description:
      'Runtime context sent to client when starting a run (<k=v,[k1=v1,..]>)',
        type: 'array',
        alias: 'c',
        default: process.env.JET_REMOTE_CONTEXT || [],
        coerce(opts) {
            const pairs = opts.map((value: string) => value.split(',')).flat();
            const splitPairs = pairs.
                map((pair: string) => {
                    const [key, value] = pair.split('=');
                    if (typeof value === 'string' && value.length > 0) {
                        return [key, coerceValue(value)];
                    }
                    return [key, true];
                }).
                filter(([k]: string) => k !== '');
            return Object.fromEntries(splitPairs);
        },
    }).
    command(
        '$0 [command...]',
        'Start Jet tests.',
        () => {},
        async (argv) => {
            const explorer = cosmiconfig('jet');
            const result = await explorer.search();
            try {
                if (!result) {
                    throw new Error('No configuration found');
                }
                console.log(`[🟩] Loaded 'jet' configuration from ${result.filepath}`);
            } catch (error) {
                console.log("[🟥] Could not find a 'jet' configuration file.");
                process.exit(1);
            }
            const cliConfig = JetConfigSchema.parse(argv);
            const jetRc = JetRcSchema.parse(result!.config);
            const jetRcGlobalConfig = jetRc.config ?? {};
            const target = jetRc.targets[argv.target];
            if (!target) {
                console.log(
                    `[🟥] Target "${argv.target}" not found in your Jet config.`,
                );
                process.exit(1);
            }
            const targetConfig = target.config ?? {};
            const contextMerged = {
                ...(cliConfig!.context ?? {}),
                ...(jetRcGlobalConfig.context ?? {}),
                ...(targetConfig.context ?? {}),
            };
            const reporterOptionsMerged = {
                ...(cliConfig!.reporterOptions ?? {}),
                ...(jetRcGlobalConfig.reporterOptions ?? {}),
                ...(targetConfig.reporterOptions ?? {}),
            };
            const mergedConfig = {
                ...cliConfig,
                ...jetRcGlobalConfig,
                ...targetConfig,
                context: contextMerged,
                reporterOptions: reporterOptionsMerged,
            };
            console.log(mergedConfig);
            console.log('[🚀] Starting tests...');
            console.log('[🧼] Filter (--grep):', argv.grep || 'none');
            console.log('[🔄] Invert filters:', argv.invert);
            console.log('[🪝] Running before hook...');
            const beforeHookReturnedConfig = await target.before?.(mergedConfig);
            if (!beforeHookReturnedConfig) {
                console.log(
                    `[🟥] Before hook on target "${argv.target}" must return a config object.`,
                );
                process.exit(1);
            }
            if (!(await isMetroRunning(argv.metroPort))) {
                console.warn(
                    `[🟨] Metro is not running (${argv.metroPort} via '--metro-port' flag.). Start it before tests to enable stack trace symbolication.`,
                );
            }
            const finalConfig = JetConfigSchema.parse(beforeHookReturnedConfig)!;
            const server = new Server({
                autoStart: false,
                autoRun: finalConfig.watch,
                host: finalConfig.hostname,
                port: finalConfig.port,
                reporter: finalConfig.reporter,
                reporterOptions: finalConfig.reporterOptions as any,

                // Intentionally passing full config as context.
                context: finalConfig,
                grep: finalConfig.grep,
                invert: finalConfig.invert,
                timeout: finalConfig.timeout,
                slow: finalConfig.slow,
            });
            return startServer(server, finalConfig, target.after).then(() => {
                if (finalConfig.coverage) {
                    attachHttpServer((server as any).wss);
                }
                if (!finalConfig.watch) {
                    server.run((failures) => {
                        (global as any).__coverage__ = coverageMap.toJSON();
                        process.exit(failures > 0 ? 1 : 0);
                    });
                }
            });
        },
    ).
    help(true).
    alias('h', 'help').argv;
