// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Buffer} from 'buffer';

import type {MSALIdentity} from '@managers/intune_manager/types';

const normalize = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const getEmailClaim = (idToken: string) => {
    try {
        const payload = idToken.split('.')[1];
        return normalize(JSON.parse(Buffer.from(payload, 'base64').toString('utf8')).email);
    } catch {
        return '';
    }
};

export function accountMatchesUser(userEmail: string, identity: MSALIdentity, idToken: string) {
    const email = normalize(userEmail);
    return Boolean(email) && (normalize(identity.upn) === email || getEmailClaim(idToken) === email);
}
