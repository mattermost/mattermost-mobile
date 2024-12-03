// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {safeDecodeURIComponent} from './index';

describe('safeDecodeURIComponent', () => {
    test('should decode a valid URI component', () => {
        const encoded = 'Hello%20World';
        const decoded = safeDecodeURIComponent(encoded);
        expect(decoded).toBe('Hello World');
    });

    test('should return the input if it is not a valid URI component', () => {
        const invalidEncoded = '%E0%A4%A';
        const result = safeDecodeURIComponent(invalidEncoded);
        expect(result).toBe(invalidEncoded);
    });

    test('should decode a complex URI component', () => {
        const encoded = 'Hello%20World%21%20How%20are%20you%3F';
        const decoded = safeDecodeURIComponent(encoded);
        expect(decoded).toBe('Hello World! How are you?');
    });

    test('should return empty string if input is empty', () => {
        const encoded = '';
        const decoded = safeDecodeURIComponent(encoded);
        expect(decoded).toBe('');
    });
});
