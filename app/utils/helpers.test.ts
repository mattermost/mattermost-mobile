// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import moment from 'moment-timezone';
import {NativeModules, Platform} from 'react-native';

import {STATUS_BAR_HEIGHT} from '@constants/view';

import {
    isMinimumServerVersion,
    buildQueryString,
    isEmail,
    identity,
    safeParseJSON,
    safeParseJSONStringArray,
    getCurrentMomentForTimezone,
    getUtcOffsetForTimeZone,
    toTitleCase,
    getRoundedTime,
    isTablet,
    pluckUnique,
    bottomSheetSnapPoint,
    hasTrailingSpaces,
    isMainActivity,
    areBothStringArraysEqual,
    hasArrayChanged,
} from './helpers';

jest.mock('@mattermost/rnshare', () => ({
    default: {
        getCurrentActivityName: jest.fn().
            mockReturnValueOnce('MainActivity').
            mockReturnValue('SomeOtherActivity'),
    },
}));

describe('Helpers', () => {
    afterAll(() => {
        Platform.OS = 'ios';
    });

    describe('isMinimumServerVersion', () => {
        test('should return true if server version meets minimum requirements', () => {
            expect(isMinimumServerVersion('4.6.0', 4, 6, 0)).toBe(true);
            expect(isMinimumServerVersion('4.6.0', 4, 5, 0)).toBe(true);
            expect(isMinimumServerVersion('4.6.1', 4, 6, 0)).toBe(true);
            expect(isMinimumServerVersion('4')).toBe(true);
            expect(isMinimumServerVersion('4.6', 4, 6)).toBe(true);
        });

        test('should return false if server version does not meet minimum requirements', () => {
            expect(isMinimumServerVersion('4.5.0', 4, 6, 0)).toBe(false);
            expect(isMinimumServerVersion('4.6.0', 4, 6, 1)).toBe(false);
        });

        test('currentVersion is not set or not a string', () => {
            expect(isMinimumServerVersion()).toBe(false);

            // @ts-expect-error argument should be a string
            expect(isMinimumServerVersion(0)).toBe(false);
        });
    });

    describe('buildQueryString', () => {
        test('should build query string from object', () => {
            const parameters = {key1: 'value1', key2: 'value2'};
            expect(buildQueryString(parameters)).toBe('?key1=value1&key2=value2');
            expect(buildQueryString({...parameters, key3: null})).toBe('?key1=value1&key2=value2');
            expect(buildQueryString({key0: null, ...parameters, key3: null})).toBe('?key1=value1&key2=value2');
            expect(buildQueryString({key1: 'value1', key0: null, key3: null, key2: 'value2'})).toBe('?key1=value1&key2=value2');
        });

        test('should handle empty object', () => {
            expect(buildQueryString({})).toBe('');
        });
    });

    describe('isEmail', () => {
        test('should validate correct emails', () => {
            expect(isEmail('test@example.com')).toBe(true);
            expect(isEmail('another@test.com')).toBe(true);
        });

        test('should invalidate incorrect emails', () => {
            expect(isEmail('invalid')).toBe(false);
            expect(isEmail('test@')).toBe(false);
            expect(isEmail('test@localhost')).toBe(true);
            expect(isEmail('test@example.com')).toBe(true);
        });
    });

    describe('identity', () => {
        test('should return the same argument', () => {
            expect(identity('test')).toBe('test');
            expect(identity(123)).toBe(123);
            const obj = {};
            expect(identity(obj)).toBe(obj);
        });
    });

    describe('safeParseJSON', () => {
        test('should parse valid JSON string', () => {
            const jsonString = '{"key": "value"}';
            expect(safeParseJSON(jsonString)).toEqual({key: 'value'});
        });

        test('should handle invalid JSON', () => {
            expect(safeParseJSON('invalid-json')).toBe('invalid-json');
        });

        test('should handle non-string input', () => {
            expect(safeParseJSON({key: 'value'})).toEqual({key: 'value'});
        });
    });

    describe('safeParseJSONStringArray', () => {
        test('should parse valid JSON array with only strings', () => {
            const jsonString = '["apple", "banana", "cherry"]';
            expect(safeParseJSONStringArray(jsonString)).toEqual(['apple', 'banana', 'cherry']);
        });

        test('should filter out non-string values from array', () => {
            const jsonString = '["apple", 123, "banana", true, "cherry", null, "date"]';
            expect(safeParseJSONStringArray(jsonString)).toEqual(['apple', 'banana', 'cherry', 'date']);
        });

        test('should return empty array for non-array JSON', () => {
            const jsonString = '{"key": "value"}';
            expect(safeParseJSONStringArray(jsonString)).toEqual([]);
        });

        test('should return empty array for primitive JSON values', () => {
            expect(safeParseJSONStringArray('"just a string"')).toEqual([]);
            expect(safeParseJSONStringArray('123')).toEqual([]);
            expect(safeParseJSONStringArray('true')).toEqual([]);
            expect(safeParseJSONStringArray('null')).toEqual([]);
        });

        test('should return empty array for invalid JSON', () => {
            expect(safeParseJSONStringArray('invalid-json')).toEqual([]);
            expect(safeParseJSONStringArray('{invalid}')).toEqual([]);
            expect(safeParseJSONStringArray('[')).toEqual([]);
        });

        test('should return empty array for empty string', () => {
            expect(safeParseJSONStringArray('')).toEqual([]);
        });

        test('should handle array with only non-string values', () => {
            const jsonString = '[123, true, null, 456, false]';
            expect(safeParseJSONStringArray(jsonString)).toEqual([]);
        });

        test('should handle empty array', () => {
            const jsonString = '[]';
            expect(safeParseJSONStringArray(jsonString)).toEqual([]);
        });

        test('should handle array with mixed types including objects and arrays', () => {
            const jsonString = '["string1", {"key": "value"}, "string2", [1, 2, 3], "string3"]';
            expect(safeParseJSONStringArray(jsonString)).toEqual(['string1', 'string2', 'string3']);
        });

        test('should handle a string array', () => {
            const jsonString = '["apple", "banana", "cherry"]';
            expect(safeParseJSONStringArray(jsonString)).toEqual(['apple', 'banana', 'cherry']);
        });

        test('should handle an array with mixed types', () => {
            const jsonString = '["apple", 123, "banana", true, "cherry", null]';
            expect(safeParseJSONStringArray(jsonString)).toEqual(['apple', 'banana', 'cherry']);
        });

        test('should handle non string input', () => {
            const input = {key: 'value'};
            expect(safeParseJSONStringArray(input)).toEqual([]);
            expect(safeParseJSONStringArray(null)).toEqual([]);
            expect(safeParseJSONStringArray(undefined)).toEqual([]);
            expect(safeParseJSONStringArray(123)).toEqual([]);
            expect(safeParseJSONStringArray(true)).toEqual([]);
            expect(safeParseJSONStringArray(false)).toEqual([]);
        });

        test('should handle empty string', () => {
            expect(safeParseJSONStringArray('')).toEqual([]);
        });
    });

    describe('getCurrentMomentForTimezone', () => {
        test('should return current moment in specified timezone', () => {
            const timezone = 'America/New_York';
            const result = getCurrentMomentForTimezone(timezone);
            expect(result.isValid()).toBe(true);
        });

        test('should return current moment if no timezone specified', () => {
            const result = getCurrentMomentForTimezone(null);
            expect(result.isValid()).toBe(true);
        });
    });

    describe('toTitleCase', () => {
        test('should convert string to title case', () => {
            expect(toTitleCase('hello world')).toBe('Hello World');
        });
    });

    describe('getRoundedTime', () => {
        test('should round time to nearest interval', () => {
            const time = moment('2024-06-01T12:34:00Z');
            const result = getRoundedTime(time);
            expect(result.minute() % 30).toBe(0); // Assuming CUSTOM_STATUS_TIME_PICKER_INTERVALS_IN_MINUTES is 15

            const time2 = moment('2024-06-01T12:00:00Z');
            const result2 = getRoundedTime(time2);
            expect(result2.minute() % 30).toBe(0);
        });
    });

    describe('isTablet', () => {
        test('should identify tablet correctly', () => {
            console.log('split mock', NativeModules.RNUtils.isRunningInSplitView());
            expect(isTablet()).toBe(false);

            const prevSplitViewModule = NativeModules.RNUtils.isRunningInSplitView;
            NativeModules.RNUtils.isRunningInSplitView = jest.fn().mockReturnValue({isSplit: false, isTablet: true});
            console.log('split mock', NativeModules.RNUtils.isRunningInSplitView());
            expect(isTablet()).toBe(true);
            NativeModules.RNUtils.isRunningInSplitView = jest.fn().mockReturnValue({isSplit: true, isTablet: true});
            expect(isTablet()).toBe(false);
            NativeModules.RNUtils.isRunningInSplitView = prevSplitViewModule; // Restore original value
        });
    });

    // Add tests for other functions similarly

    describe('areBothStringArraysEqual', () => {
        test('should compare two string arrays', () => {
            const arr1 = ['apple', 'banana', 'cherry'];
            const arr2 = ['banana', 'cherry', 'apple'];
            expect(areBothStringArraysEqual(arr1, arr2)).toBe(true);
        });

        test('should return false for unequal arrays or empty', () => {
            const arr1 = ['apple', 'banana', 'cherry'];
            const arr2 = ['banana', 'cherry', 'orange'];
            expect(areBothStringArraysEqual(arr1, arr2)).toBe(false);
            expect(areBothStringArraysEqual(arr1, [...arr1, ...arr2])).toBe(false);
            expect(areBothStringArraysEqual([], [])).toBe(false);
        });
    });

    describe('getUtcOffsetForTimeZone', () => {
        test('should return UTC offset for timezone', () => {
            const timezone = 'America/New_York';
            const result = getUtcOffsetForTimeZone(timezone);
            expect(result).toBe(moment.tz(timezone).utcOffset());
        });
    });
    describe('pluckUnique', () => {
        test('should pluck unique values based on key', () => {
            const array = [
                {id: 1, name: 'John'},
                {id: 2, name: 'Jane'},
                {id: 1, name: 'John'},
            ];
            const result = pluckUnique('id')(array);
            expect(result).toEqual([1, 2]);
        });
    });

    describe('bottomSheetSnapPoint', () => {
        test('should calculate bottom sheet snap point', () => {
            const itemsCount = 5;
            const itemHeight = 50;
            const result = bottomSheetSnapPoint(itemsCount, itemHeight);
            const expected = (itemsCount * itemHeight) + STATUS_BAR_HEIGHT;
            expect(result).toBe(expected);
        });
    });

    describe('hasTrailingSpaces', () => {
        test('should detect trailing spaces', () => {
            const term = 'Hello ';
            const result = hasTrailingSpaces(term);
            expect(result).toBe(true);
        });

        test('should not detect trailing spaces', () => {
            const term = 'Hello';
            const result = hasTrailingSpaces(term);
            expect(result).toBe(false);
        });
    });

    describe('isMainActivity', () => {
        test('should return true on iOS', () => {
            Platform.OS = 'ios';
            const result = isMainActivity();
            expect(result).toBe(true);
        });

        test('should return true if current activity is MainActivity on Android', () => {
            Platform.OS = 'android';
            const result = isMainActivity();
            expect(result).toBe(true);
        });

        test('should return false if current activity is not MainActivity on Android', () => {
            Platform.OS = 'android';
            const result = isMainActivity();
            expect(result).toBe(false);
        });
    });

    describe('hasArrayChanged', () => {
        test('should return true for arrays with different lengths', () => {
            expect(hasArrayChanged(['a', 'b'], ['a', 'b', 'c'])).toBe(true);
            expect(hasArrayChanged(['a', 'b', 'c'], ['a', 'b'])).toBe(true);
        });

        test('should return true for arrays with same length but different elements', () => {
            expect(hasArrayChanged(['a', 'b'], ['a', 'c'])).toBe(true);
            expect(hasArrayChanged(['x', 'y'], ['a', 'b'])).toBe(true);
        });

        test('should return false for arrays with same elements (same order)', () => {
            expect(hasArrayChanged(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(false);
        });

        test('should return false for arrays with same elements (different order)', () => {
            expect(hasArrayChanged(['a', 'b', 'c'], ['c', 'b', 'a'])).toBe(false);
            expect(hasArrayChanged(['x', 'y', 'z'], ['z', 'x', 'y'])).toBe(false);
        });

        test('should return false for empty arrays', () => {
            expect(hasArrayChanged([], [])).toBe(false);
        });

        test('should return true when one array is empty', () => {
            expect(hasArrayChanged([], ['a'])).toBe(true);
            expect(hasArrayChanged(['a'], [])).toBe(true);
        });

        test('should handle duplicate elements correctly', () => {
            expect(hasArrayChanged(['a', 'a', 'b'], ['a', 'b', 'a'])).toBe(false);
            expect(hasArrayChanged(['a', 'a'], ['a', 'b'])).toBe(true);
        });
    });
});
