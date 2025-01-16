// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';
import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';
import type {ClientThreadsMix} from './threads';

const userId = 'user_id';
const teamId = 'team_id';
const threadId = 'thread_id';

describe('ClientThreads', () => {
    let client: ClientThreadsMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('getThreads', async () => {
        const before = 'before';
        const after = 'after';
        const pageSize = 10;
        const deleted = true;
        const unread = true;
        const since = 123456;
        const totalsOnly = true;
        const serverVersion = '6.0.0';
        const excludeDirect = true;
        const groupLabel = 'Cold Start';
        const queryStringObj = {
            extended: 'true',
            before,
            after,
            deleted,
            unread,
            since,
            totalsOnly,
            excludeDirect,
            per_page: pageSize,
        };
        const expectedUrl = `${client.getThreadsRoute(userId, teamId)}${buildQueryString(queryStringObj)}`;
        const expectedOptions = {method: 'get', groupLabel};

        await client.getThreads(userId, teamId, before, after, pageSize, deleted, unread, since, totalsOnly, serverVersion, excludeDirect, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        const defaultQueryStringObj = {
            extended: 'true',
            before: '',
            after: '',
            deleted: false,
            unread: false,
            since: 0,
            totalsOnly: false,
            excludeDirect: false,
            pageSize: PER_PAGE_DEFAULT,
        };
        const expectedUrlDefault = `${client.getThreadsRoute(userId, teamId)}${buildQueryString(defaultQueryStringObj)}`;
        await client.getThreads(userId, teamId);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrlDefault, {method: 'get', groupLabel: undefined});
    });

    test('getThread', async () => {
        const extended = false;
        const expectedUrl = `${client.getThreadRoute(userId, teamId, threadId)}${buildQueryString({extended})}`;
        const expectedOptions = {method: 'get'};

        await client.getThread(userId, teamId, threadId, extended);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        const expectedUrlDefault = `${client.getThreadRoute(userId, teamId, threadId)}${buildQueryString({extended: true})}`;
        await client.getThread(userId, teamId, threadId);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrlDefault, expectedOptions);
    });

    test('markThreadAsRead', async () => {
        const timestamp = 123456;
        const expectedUrl = `${client.getThreadRoute(userId, teamId, threadId)}/read/${timestamp}`;
        const expectedOptions = {method: 'put', body: {}};

        await client.markThreadAsRead(userId, teamId, threadId, timestamp);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('markThreadAsUnread', async () => {
        const postId = 'post_id';
        const expectedUrl = `${client.getThreadRoute(userId, teamId, threadId)}/set_unread/${postId}`;
        const expectedOptions = {method: 'post'};

        await client.markThreadAsUnread(userId, teamId, threadId, postId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateTeamThreadsAsRead', async () => {
        const expectedUrl = `${client.getThreadsRoute(userId, teamId)}/read`;
        const expectedOptions = {method: 'put', body: {}};

        await client.updateTeamThreadsAsRead(userId, teamId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateThreadFollow', async () => {
        const state = true;
        const expectedUrl = `${client.getThreadRoute(userId, teamId, threadId)}/following`;
        const expectedOptions = {method: 'put', body: {}};

        await client.updateThreadFollow(userId, teamId, threadId, state);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with state = false
        const expectedOptionsDelete = {method: 'delete', body: {}};
        await client.updateThreadFollow(userId, teamId, threadId, false);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptionsDelete);
    });
});
