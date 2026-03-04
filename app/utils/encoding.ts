// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import base64 from 'base-64';

export function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return base64.encode(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
    const binary = base64.decode(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
    const b64 = bytesToBase64(bytes);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').split('=').join('');
}
