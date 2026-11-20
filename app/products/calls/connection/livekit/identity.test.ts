// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {parseIdentity} from './identity';

describe('parseIdentity', () => {
    it('splits a userID___sessionID identity into both parts', () => {
        expect(parseIdentity('userid123___sessionid456')).toEqual({
            userID: 'userid123',
            sessionID: 'sessionid456',
        });
    });

    it('falls back to treating the whole identity as the session when there is no separator', () => {
        expect(parseIdentity('malformed')).toEqual({userID: '', sessionID: 'malformed'});
    });

    it('falls back when the identity carries more than one separator', () => {
        const identity = 'a___b___c';
        expect(parseIdentity(identity)).toEqual({userID: '', sessionID: identity});
    });
});
