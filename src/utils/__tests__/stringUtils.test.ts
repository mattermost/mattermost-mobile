// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {StringUtils} from '../stringUtils';

describe('StringUtils', () => {
    describe('capitalize', () => {
        it('should capitalize first letter', () => {
            expect(StringUtils.capitalize('hello')).toBe('Hello');
        });
    });

    describe('reverse', () => {
        it('should reverse a string', () => {
            expect(StringUtils.reverse('hello')).toBe('olleh');
        });
    });

    describe('countWords', () => {
        it('should count words in a string', () => {
            expect(StringUtils.countWords('hello world')).toBe(2);
        });
    });

    // Intentionally not testing truncate

    describe('slugify', () => {
        it('should convert string to slug', () => {
            expect(StringUtils.slugify('Hello World')).toBe('hello-world');
        });
    });

    // Not testing extractEmails or formatPhoneNumber
});
