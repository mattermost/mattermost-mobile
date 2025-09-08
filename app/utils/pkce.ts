// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// RFC 7636 PKCE helpers for mobile SSO

import base64 from 'base-64';
import {getRandomValues, randomUUID} from 'expo-crypto';
import {sha256} from 'js-sha256';

function getRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    getRandomValues(bytes);
    return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = base64.encode(binary);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').split('=').join('');
}

export function generateState(): string {
    // Use UUID for state; allowed PKCE chars include '-'
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

export type PkceBundle = {
    state: string;
    codeVerifier: string;
    codeChallenge: string;
    method: 'S256' | 'plain';
};

export function createPkceBundle(): PkceBundle {
    const state = generateState();
    const codeVerifier = generateCodeVerifier(64);
    try {
        const codeChallenge = computeS256CodeChallenge(codeVerifier);
        return {state, codeVerifier, codeChallenge, method: 'S256'};
    } catch {
        // Fallback to plain if hashing fails for any reason
        return {state, codeVerifier, codeChallenge: codeVerifier, method: 'plain'};
    }
}

