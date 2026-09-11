// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {findPhoneNumbers, isTelHref, toTelHref} from './phone_number';

describe('toTelHref', () => {
    it('should keep a leading plus and strip separators', () => {
        expect(toTelHref('+1 (555) 123-4567')).toBe('tel:+15551234567');
    });

    it('should strip a tel: prefix before normalizing', () => {
        expect(toTelHref('tel:+15551234567')).toBe('tel:+15551234567');
    });

    it('should strip separators from a national number', () => {
        expect(toTelHref('(555) 123-4567')).toBe('tel:5551234567');
    });
});

describe('isTelHref', () => {
    it('should detect tel: hrefs case-insensitively', () => {
        expect(isTelHref('tel:+15551234567')).toBe(true);
        expect(isTelHref('TEL:5551234567')).toBe(true);
        expect(isTelHref('mailto:user@example.com')).toBe(false);
    });
});

describe('findPhoneNumbers', () => {
    it('should match a grouped national number', () => {
        expect(findPhoneNumbers('Call me at 555-123-4567')).toEqual([{
            index: 11,
            length: 12,
            raw: '555-123-4567',
            href: 'tel:5551234567',
        }]);
    });

    it('should match a parenthesized area code', () => {
        expect(findPhoneNumbers('Call me at (555) 123-4567')).toEqual([{
            index: 11,
            length: 14,
            raw: '(555) 123-4567',
            href: 'tel:5551234567',
        }]);
    });

    it('should match an E.164 number', () => {
        expect(findPhoneNumbers('Call me at +15551234567')).toEqual([{
            index: 11,
            length: 12,
            raw: '+15551234567',
            href: 'tel:+15551234567',
        }]);
    });

    it('should match an international number with separators', () => {
        expect(findPhoneNumbers('Call +44 20 7946 0958')).toEqual([{
            index: 5,
            length: 16,
            raw: '+44 20 7946 0958',
            href: 'tel:+442079460958',
        }]);
    });

    it('should match a tel: URI that includes a plus', () => {
        expect(findPhoneNumbers('Call me at tel:+15551234567')).toEqual([{
            index: 11,
            length: 16,
            raw: 'tel:+15551234567',
            href: 'tel:+15551234567',
        }]);
    });

    it('should match a toll-free number', () => {
        expect(findPhoneNumbers('Call 1-800-555-1234')).toEqual([{
            index: 5,
            length: 14,
            raw: '1-800-555-1234',
            href: 'tel:18005551234',
        }]);
    });

    it('should match multiple numbers in one string', () => {
        const matches = findPhoneNumbers('555-123-4567 or 1-800-555-1234');
        expect(matches).toHaveLength(2);
        expect(matches[0].href).toBe('tel:5551234567');
        expect(matches[1].href).toBe('tel:18005551234');
    });

    it('should not include trailing sentence punctuation', () => {
        const matches = findPhoneNumbers('Call 555-123-4567.');
        expect(matches).toHaveLength(1);
        expect(matches[0].raw).toBe('555-123-4567');
    });

    it('should not match an overlong number continued by a separator', () => {
        expect(findPhoneNumbers('+123456789012345-6')).toEqual([]);
        expect(findPhoneNumbers('+1234567890123456')).toEqual([]);
    });

    it('should not match a grouped number with a numeric prefix', () => {
        expect(findPhoneNumbers('99-555-123-4567')).toEqual([]);
        expect(findPhoneNumbers('2-555-123-4567')).toEqual([]);
    });

    it('should still match a number before a parenthesized second number', () => {
        const matches = findPhoneNumbers('555-123-4567 (555) 987-6543');
        expect(matches).toHaveLength(2);
        expect(matches[0].href).toBe('tel:5551234567');
        expect(matches[1].href).toBe('tel:5559876543');
    });

    it('should match two space-separated numbers', () => {
        const matches = findPhoneNumbers('555-123-4567 555-987-6543');
        expect(matches).toHaveLength(2);
        expect(matches[0].href).toBe('tel:5551234567');
        expect(matches[1].href).toBe('tel:5559876543');
    });

    it('should not match a bare digit run', () => {
        expect(findPhoneNumbers('Call me at 5551234567')).toEqual([]);
    });

    it('should not match ticket IDs, dates, or version numbers', () => {
        expect(findPhoneNumbers('Ticket 1234567890')).toEqual([]);
        expect(findPhoneNumbers('Date 2024-01-15')).toEqual([]);
        expect(findPhoneNumbers('Version 2.44.0')).toEqual([]);
        expect(findPhoneNumbers('SSN 123-45-6789')).toEqual([]);
    });

    it('should not match a number attached to a preceding word', () => {
        expect(findPhoneNumbers('ext555-123-4567')).toEqual([]);
    });
});
