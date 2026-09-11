// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createHmac} from 'crypto';

// RFC 4648 base32 alphabet (no padding), as used by Mattermost MFA secrets.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const base32Decode = (secret: string): Buffer => {
    const normalized = secret.toUpperCase().replace(/[=]+$/, '').replace(/\s+/g, '');
    let bits = '';
    for (const char of normalized) {
        const value = BASE32_ALPHABET.indexOf(char);
        if (value === -1) {
            continue;
        }
        bits += value.toString(2).padStart(5, '0');
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }

    return Buffer.from(bytes);
};

/**
 * Generate a TOTP code (RFC 6238) for the given base32 secret.
 * Mattermost uses the standard defaults: SHA1, 6 digits, 30s period.
 * @param {string} secret - base32-encoded MFA secret
 * @param {number} period - time step in seconds (default 30)
 * @param {number} digits - number of digits in the code (default 6)
 * @return {string} the current TOTP code, zero-padded
 */
export const generateTotp = (secret: string, period = 30, digits = 6): string => {
    const counter = Math.floor(Date.now() / 1000 / period);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const hmac = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
    const offset = hmac.readUInt8(hmac.length - 1) & 0x0f;
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits);

    return code.toString().padStart(digits, '0');
};

/**
 * Wait until the current TOTP time step advances past the one in effect when
 * this function is called. Mattermost records each used time step (DisallowReuse)
 * and rejects a code from a step that was already consumed (e.g. the step used to
 * activate MFA), so a login code must come from a fresh window.
 * @param {number} period - time step in seconds (default 30)
 */
export const waitForNextTotpWindow = async (period = 30): Promise<void> => {
    const now = Math.floor(Date.now() / 1000);
    const waitSec = (period - (now % period)) + 1;
    await new Promise<void>((resolve) => {
        setTimeout(resolve, waitSec * 1000);
    });
};
