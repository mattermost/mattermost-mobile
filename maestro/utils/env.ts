// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env, no-console */

/**
 * Maestro environment helper — consistent env-var access with fallback defaults.
 *
 * Every Maestro fixture/seed script MUST use these helpers so that:
 *   • CI can override any value via GitHub Secrets / workflow inputs
 *   • Local dev gets sensible defaults without hardcoding secrets
 *
 * Usage:
 *   import {env, envNum, envBool, maestroEnvFile} from '../utils/env';
 *   const url = env('SITE_1_URL', 'http://localhost:8065');
 */

/** Read a required env var (exits with error if missing). */
export function required(key: string): string {
    const val = process.env[key];
    if (!val) {
        console.error(`[maestro] Error: ${key} is required`);
        process.exit(1);
    }
    return val;
}

/** Read an optional string env var, returning `fallback` when unset. */
export function env(key: string, fallback: string): string {
    return process.env[key] || fallback;
}

/** Read an optional numeric env var, returning `fallback` when unset or NaN. */
export function envNum(key: string, fallback: number): number {
    const raw = process.env[key];
    if (raw === undefined || raw === '') {
        return fallback;
    }
    const n = Number(raw);
    return Number.isNaN(n) ? fallback : n;
}

/** Read an optional boolean env var (truthy: '1'|'true'|'yes'). */
export function envBool(key: string, fallback: boolean): boolean {
    const raw = process.env[key];
    if (raw === undefined || raw === '') {
        return fallback;
    }
    return ['1', 'true', 'yes'].includes(raw.toLowerCase());
}

/** Absolute path to the generated .maestro-test-env.sh inside maestro/. */
export const MAESTRO_ENV_FILE = __dirname + '/../.maestro-test-env.sh';
