// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {buildQueryString, isMinimumServerVersion, isEmail} from '@mm-redux/utils/helpers';

describe('Helpers', () => {
    it('isMinimumServerVersion', () => {
        assert.ok(isMinimumServerVersion('1.0.0', 1, 0, 0));
        assert.ok(isMinimumServerVersion('1.1.1', 1, 1, 1));
        assert.ok(!isMinimumServerVersion('1.0.0', 2, 0, 0));
        assert.ok(isMinimumServerVersion('4.6', 2, 0, 0));
        assert.ok(!isMinimumServerVersion('4.6', 4, 7, 0));
        assert.ok(isMinimumServerVersion('4.6.1', 2, 0, 0));
        assert.ok(isMinimumServerVersion('4.7.1', 4, 6, 2));
        assert.ok(!isMinimumServerVersion('4.6.1', 4, 6, 2));
        assert.ok(!isMinimumServerVersion('3.6.1', 4, 6, 2));
        assert.ok(isMinimumServerVersion('4.6.1', 3, 7, 2));
        assert.ok(isMinimumServerVersion('5', 4, 6, 2));
        assert.ok(isMinimumServerVersion('5', 5));
        assert.ok(isMinimumServerVersion('5.1', 5));
        assert.ok(isMinimumServerVersion('5.1', 5, 1));
        assert.ok(!isMinimumServerVersion('5.1', 5, 2));
        assert.ok(isMinimumServerVersion('5.1.0', 5));
        assert.ok(isMinimumServerVersion('5.1.1', 5, 1, 1));
        assert.ok(!isMinimumServerVersion('5.1.1', 5, 1, 2));
        assert.ok(isMinimumServerVersion('4.6.2.sakjdgaksfg', 4, 6, 2));
        assert.ok(!isMinimumServerVersion());
    });

    it('buildQueryString', () => {
        assert.equal(buildQueryString({}), '');
        assert.equal(buildQueryString({a: 1}), '?a=1');
        assert.equal(buildQueryString({a: 1, b: 'str'}), '?a=1&b=str');
    });
});

describe('Utils.isEmail', () => {
    it('', () => {
        for (const data of [
            {
                email: 'prettyandsimple@example.com',
                valid: true,
            },
            {
                email: 'very.common@example.com',
                valid: true,
            },
            {
                email: 'disposable.style.email.with+symbol@example.com',
                valid: true,
            },
            {
                email: 'other.email-with-dash@example.com',
                valid: true,
            },
            {
                email: 'fully-qualified-domain@example.com',
                valid: true,
            },
            {
                email: 'user.name+tag+sorting@example.com',
                valid: true,
            },
            {
                email: 'x@example.com',
                valid: true,
            },
            {
                email: 'example-indeed@strange-example.com',
                valid: true,
            },
            {
                email: 'admin@mailserver1',
                valid: true,
            },
            {
                email: '#!$%&\'*+-/=?^_`{}|~@example.org',
                valid: true,
            },
            {
                email: 'example@s.solutions',
                valid: true,
            },
            {
                email: 'Abc.example.com',
                valid: false,
            },
            {
                email: 'A@b@c@example.com',
                valid: false,
            },
            {
                email: '<testing> test.email@example.com',
                valid: false,
            },
            {
                email: 'test <test@address.do>',
                valid: false,
            },
            {
                email: 'comma@domain.com, separated@domain.com',
                valid: false,
            },
            {
                email: 'comma@domain.com,separated@domain.com',
                valid: false,
            },
        ]) {
            assert.equal(isEmail(data.email), data.valid);
        }
    });
});
