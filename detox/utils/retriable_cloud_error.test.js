// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {isRetriableCloudWarmupError} = require('./retriable_cloud_error');

describe('isRetriableCloudWarmupError', () => {
    it('should retry 403 from an inactive Matterwick API', () => {
        assert.equal(isRetriableCloudWarmupError({status: 403, message: 'Request failed with status code 403'}), true);
    });

    it('should retry a redirect to the inactive portal even when status is 302', () => {
        assert.equal(isRetriableCloudWarmupError({
            status: 302,
            message: '[seed] Test server redirected to cloud/inactive',
        }), true);
    });

    it('should retry HTML from the inactive portal on a 200', () => {
        assert.equal(isRetriableCloudWarmupError({
            status: 200,
            body: '<!DOCTYPE html>\n<html lang="en">',
        }), true);
    });

    it('should retry 5xx and missing status', () => {
        assert.equal(isRetriableCloudWarmupError({status: 502, message: 'Bad Gateway'}), true);
        assert.equal(isRetriableCloudWarmupError({message: 'ECONNRESET'}), true);
    });

    it('should retry 429', () => {
        assert.equal(isRetriableCloudWarmupError({status: 429, message: 'Too Many Requests'}), true);
    });

    it('should not retry a normal 401 from a live login endpoint', () => {
        assert.equal(isRetriableCloudWarmupError({
            status: 401,
            message: 'Login failed',
            body: {id: 'api.user.login.invalid_credentials'},
        }), false);
    });
});
