// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {sanitizeLikeString} from '.';

describe('Test SQLite Sanitize like string with latin and non-latin characters', () => {
    const disallowed = ',./;[]!@#$%^&*()_-=+~';

    test('test (latin)', () => {
        expect(sanitizeLikeString('test123')).toBe('test123');
        expect(sanitizeLikeString(`test123${disallowed}`)).toBe(`test123${'_'.repeat(disallowed.length)}`);
    });

    test('test (arabic)', () => {
        expect(sanitizeLikeString('اختبار123')).toBe('اختبار123');
        expect(sanitizeLikeString(`اختبار123${disallowed}`)).toBe(`اختبار123${'_'.repeat(disallowed.length)}`);
    });

    test('test (greek)', () => {
        expect(sanitizeLikeString('δοκιμή123')).toBe('δοκιμή123');
        expect(sanitizeLikeString(`δοκιμή123${disallowed}`)).toBe(`δοκιμή123${'_'.repeat(disallowed.length)}`);
    });

    test('test (hebrew)', () => {
        expect(sanitizeLikeString('חשבון123')).toBe('חשבון123');
        expect(sanitizeLikeString(`חשבון123${disallowed}`)).toBe(`חשבון123${'_'.repeat(disallowed.length)}`);
    });

    test('test (russian)', () => {
        expect(sanitizeLikeString('тест123')).toBe('тест123');
        expect(sanitizeLikeString(`тест123${disallowed}`)).toBe(`тест123${'_'.repeat(disallowed.length)}`);
    });

    test('test (chinese trad)', () => {
        expect(sanitizeLikeString('測試123')).toBe('測試123');
        expect(sanitizeLikeString(`測試123${disallowed}`)).toBe(`測試123${'_'.repeat(disallowed.length)}`);
    });

    test('test (japanese)', () => {
        expect(sanitizeLikeString('テスト123')).toBe('テスト123');
        expect(sanitizeLikeString(`テスト123${disallowed}`)).toBe(`テスト123${'_'.repeat(disallowed.length)}`);
    });
});
