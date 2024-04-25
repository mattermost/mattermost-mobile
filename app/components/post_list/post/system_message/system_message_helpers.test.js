// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Post} from '@constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {SystemMessage} from './system_message';

jest.mock('@react-native-clipboard/clipboard', () => ({}));

const baseProps = {
    author: {
        id: 'me',
        username: 'username',
        firstName: 'Test',
        lastName: 'Author',
    },
};

describe('renderSystemMessage', () => {
    let database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    test('uses renderer for Channel Header update', () => {
        const post = {
            props: {
                old_header: 'old header',
                new_header: 'new header',
            },
            type: Post.POST_TYPES.HEADER_CHANGE,
        };
        const {getByText, toJSON} = renderWithEverything(
            <SystemMessage
                post={post}
                {...baseProps}
            />,
            {database},
        );
        expect(toJSON()).toMatchSnapshot();
        expect(getByText('@username')).toBeTruthy();
        expect(getByText('updated the channel header from: old header to: new header')).toBeTruthy();
    });

    test('uses renderer for Channel Display Name update', () => {
        const post = {
            props: {
                old_displayname: 'old displayname',
                new_displayname: 'new displayname',
            },
            type: Post.POST_TYPES.DISPLAYNAME_CHANGE,
        };

        const {getByText, toJSON} = renderWithEverything(
            <SystemMessage
                post={post}
                {...baseProps}
            />,
            {database},
        );
        expect(toJSON()).toMatchSnapshot();
        expect(getByText('@username')).toBeTruthy();
        expect(getByText('updated the channel display name from: old displayname to: new displayname')).toBeTruthy();
    });

    test('uses renderer for Channel Purpose update', () => {
        const post = {
            props: {
                old_purpose: 'old purpose',
                new_purpose: 'new purpose',
            },
            type: Post.POST_TYPES.PURPOSE_CHANGE,
        };
        const {getByText, toJSON} = renderWithEverything(
            <SystemMessage
                post={post}
                {...baseProps}
            />,
            {database},
        );
        expect(toJSON()).toMatchSnapshot();
        expect(getByText('@username updated the channel purpose from: old purpose to: new purpose')).toBeTruthy();
    });

    test('uses renderer for archived channel', () => {
        const post = {
            type: Post.POST_TYPES.CHANNEL_DELETED,
        };

        const {getByText, toJSON} = renderWithEverything(
            <SystemMessage
                post={post}
                {...baseProps}
            />,
            {database},
        );
        expect(toJSON()).toMatchSnapshot();
        expect(getByText('@username')).toBeTruthy();
        expect(getByText('archived the channel')).toBeTruthy();
    });

    test('uses renderer for OLD archived channel without a username', () => {
        const post = {
            props: {},
            type: Post.POST_TYPES.CHANNEL_DELETED,
        };

        const {getByText, toJSON} = renderWithEverything(
            <SystemMessage
                {...baseProps}
                post={post}
                author={undefined}
            />,
            {database},
        );
        expect(toJSON()).toMatchSnapshot();
        expect(getByText('archived the channel')).toBeTruthy();
    });

    test('uses renderer for unarchived channel', () => {
        const post = {
            type: Post.POST_TYPES.CHANNEL_UNARCHIVED,
        };

        const viewOne = renderWithEverything(
            <SystemMessage
                {...baseProps}
                post={post}
            />,
            {database},
        );
        expect(viewOne.toJSON()).toMatchSnapshot();
        expect(viewOne.getByText('@username')).toBeTruthy();
        expect(viewOne.getByText('unarchived the channel')).toBeTruthy();

        const viewTwo = renderWithEverything(
            <SystemMessage
                {...baseProps}
                post={post}
                author={undefined}
            />,
            {database},
        );
        expect(viewTwo.toJSON()).toBeNull();
        expect(viewTwo.queryByText('archived the channel')).toBeFalsy();
    });

    test('is null for non-qualifying system messages', () => {
        const post = {
            postType: 'not_relevant',
        };

        const renderedMessage = renderWithEverything(
            <SystemMessage
                {...baseProps}
                post={post}
            />,
            {database},
        );
        expect(renderedMessage.toJSON()).toBeNull();
    });

    test('uses renderer for Guest added and join to channel', () => {
        const post = {
            props: {
                username: 'username',
            },
            type: Post.POST_TYPES.GUEST_JOIN_CHANNEL,
        };
        const joined = renderWithEverything(
            <SystemMessage
                post={post}
                {...baseProps}
            />,
            {database},
        );
        expect(joined.toJSON()).toMatchSnapshot();
        expect(joined.getByText('@username')).toBeTruthy();
        expect(joined.getByText('joined the channel as a guest.')).toBeTruthy();

        post.type = Post.POST_TYPES.ADD_GUEST_TO_CHANNEL;
        post.props = {
            username: 'username',
            addedUsername: 'other.user',
        };

        const added = renderWithEverything(
            <SystemMessage
                post={post}
                {...baseProps}
            />,
            {database},
        );
        expect(added.toJSON()).toMatchSnapshot();
        expect(added.getByText('@other.user')).toBeTruthy();
        expect(added.getByText('added to the channel as a guest by')).toBeTruthy();
        expect(added.getByText('@username.')).toBeTruthy();
    });
});
