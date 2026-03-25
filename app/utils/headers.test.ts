// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getResponseHeader} from './headers';

describe('getResponseHeader', () => {
    it('should return the value for an exact-case match', () => {
        const headers = {'X-Reject-Reason': 'pre-auth'};
        expect(getResponseHeader(headers, 'X-Reject-Reason')).toBe('pre-auth');
    });

    it('should return the value when header name differs in case', () => {
        const headers = {'x-reject-reason': 'pre-auth'};
        expect(getResponseHeader(headers, 'X-Reject-Reason')).toBe('pre-auth');
    });

    it('should return the value when lookup name is lowercase but header is uppercase', () => {
        const headers = {'X-REJECT-REASON': 'pre-auth'};
        expect(getResponseHeader(headers, 'x-reject-reason')).toBe('pre-auth');
    });

    it('should return undefined when the header is not present', () => {
        const headers = {'Content-Type': 'application/json'};
        expect(getResponseHeader(headers, 'X-Reject-Reason')).toBeUndefined();
    });

    it('should return undefined when headers object is undefined', () => {
        expect(getResponseHeader(undefined, 'X-Reject-Reason')).toBeUndefined();
    });
});
