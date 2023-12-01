// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {areBothStringArraysEqual} from '@utils/helpers';

describe('areBothStringArraysEqual', () => {
    test('Should return false when length of arrays are not equal', () => {
        const array1 = ['test1', 'test2'];
        const array2 = ['test1'];

        expect(areBothStringArraysEqual(array1, array2)).toEqual(false);
    });

    test('Should return false when arrays are not equal', () => {
        const array1 = ['test1', 'test2'];
        const array2 = ['test1', 'test2', 'test3'];

        expect(areBothStringArraysEqual(array1, array2)).toEqual(false);
    });

    test('Should return false when either array is empty', () => {
        const array1 = ['test1', 'test2'];
        const array2: string[] = [];

        expect(areBothStringArraysEqual(array1, array2)).toEqual(false);
    });

    test('Should return true when arrays are equal', () => {
        const array1 = ['test1', 'test2'];
        const array2 = ['test1', 'test2'];

        expect(areBothStringArraysEqual(array1, array2)).toEqual(true);
    });

    test('Should return true when arrays are equal but in different order', () => {
        const array1 = ['test1', 'test2'];
        const array2 = ['test2', 'test1'];

        expect(areBothStringArraysEqual(array1, array2)).toEqual(true);
    });

    test('Should return true when both arrays are empty', () => {
        const array1: string[] = [];
        const array2: string[] = [];

        expect(areBothStringArraysEqual(array1, array2)).toEqual(false);
    });
});
