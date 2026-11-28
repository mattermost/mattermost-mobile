// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Buffer} from 'buffer';

import {accountMatchesUser} from './intune_account';

const identity = {upn: 'Jane@Contoso.com', tid: 'tenant-id', oid: 'object-id'};
const tokenWith = (claims: object) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

describe('accountMatchesUser', () => {
    it('matches the UPN ignoring case and whitespace', () => {
        expect(accountMatchesUser(' jane@contoso.com ', identity, 'id-token')).toBe(true);
    });

    it('matches the email claim of the ID token when the UPN differs', () => {
        const other = {...identity, upn: 'jane@tenant.onmicrosoft.com'};
        expect(accountMatchesUser('jane@contoso.com', other, tokenWith({email: 'Jane@Contoso.com'}))).toBe(true);
    });

    it('rejects a different account', () => {
        const other = {...identity, upn: 'other@contoso.com'};
        expect(accountMatchesUser('jane@contoso.com', other, tokenWith({email: 'other@contoso.com'}))).toBe(false);
    });

    it('rejects when the user has no email', () => {
        expect(accountMatchesUser('', {...identity, upn: ''}, tokenWith({}))).toBe(false);
    });

    it('ignores a malformed ID token', () => {
        const other = {...identity, upn: 'other@contoso.com'};
        expect(accountMatchesUser('jane@contoso.com', other, 'not-a-jwt')).toBe(false);
    });
});
