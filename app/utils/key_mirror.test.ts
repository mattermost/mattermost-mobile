// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from './key_mirror';

describe('keyMirror', () => {
    test('creates an object with keys mirrored as values', () => {
        const input = {key1: null, key2: null, key3: null};
        const expectedOutput = {key1: 'key1', key2: 'key2', key3: 'key3'};
        expect(keyMirror(input)).toEqual(expectedOutput);
    });

    test('throws an error if argument is not an object', () => {
        // @ts-expect-error null will complain by TS
        expect(() => keyMirror(null)).toThrow('keyMirror(...): Argument must be an object.');
        expect(() => keyMirror([])).toThrow('keyMirror(...): Argument must be an object.');
        expect(() => keyMirror('string')).toThrow('keyMirror(...): Argument must be an object.');
        expect(() => keyMirror(42)).toThrow('keyMirror(...): Argument must be an object.');
        expect(() => keyMirror(true)).toThrow('keyMirror(...): Argument must be an object.');
    });

    test('ignores properties from the prototype chain', () => {
        const input = Object.create({inheritedKey: null});
        input.ownKey = null;
        const expectedOutput = {ownKey: 'ownKey'};
        expect(keyMirror(input)).toEqual(expectedOutput);
    });
});
