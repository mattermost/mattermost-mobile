// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// SAML mobile code-exchange challenge helpers (modeled after RFC 7636)

import {getRandomValues, randomUUID} from 'expo-crypto';
import {sha256} from 'js-sha256';

import {bytesToBase64Url} from '@utils/encoding';

function getRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    getRandomValues(bytes);
    return bytes;
}

export function generateState(): string {
    // Use UUID for state; allowed challenge chars include '-'
    return randomUUID();
}

export function generateCodeVerifier(length = 64): string {
    // Allowed characters are ALPHA / DIGIT / "-" / "." / "_" / "~"
    // We generate random bytes and base64url encode without padding which fits the charset
    const bytes = getRandomBytes(length);
    return bytesToBase64Url(bytes);
}

export function computeS256CodeChallenge(verifier: string): string {
    const hashArrayBuffer = sha256.arrayBuffer(verifier) as ArrayBuffer;
    const bytes = new Uint8Array(hashArrayBuffer);
    return bytesToBase64Url(bytes);
}

export type SAMLChallenge = {
    state: string;
    codeVerifier: string;
    codeChallenge: string;
    method: 'S256';
};

export function createSamlChallenge(): SAMLChallenge {
    const state = generateState();
    const codeVerifier = generateCodeVerifier(64);
    const codeChallenge = computeS256CodeChallenge(codeVerifier);
    return {state, codeVerifier, codeChallenge, method: 'S256'};
}
