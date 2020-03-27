// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getChannel} from '@redux/selectors/entities/channels';
import * as PostUtils from '@redux/utils/post_utils';

import {makeMapStateToProps} from './index.js';

jest.mock('@redux/selectors/entities/channels', () => {
    const channels = require.requireActual('@redux/selectors/entities/channels');

    return {
        ...channels,
        getChannel: jest.fn(),
        canManageChannelMembers: jest.fn(),
        getCurrentChannelId: jest.fn(),
    };
});

jest.mock('@redux/selectors/entities/preferences', () => {
    const preferences = require.requireActual('@redux/selectors/entities/preferences');
    return {
        ...preferences,
        getTheme: jest.fn(),
    };
});

jest.mock('@redux/selectors/entities/general', () => {
    const general = require.requireActual('@redux/selectors/entities/general');
    return {
        ...general,
        getConfig: jest.fn(),
        getLicense: jest.fn().mockReturnValue({}),
    };
});

jest.mock('@redux/selectors/entities/users', () => {
    const users = require.requireActual('@redux/selectors/entities/users');
    return {
        ...users,
        getCurrentUserId: jest.fn(),
        getCurrentUserRoles: jest.fn(),
    };
});

jest.mock('@redux/selectors/entities/teams', () => {
    const teams = require.requireActual('@redux/selectors/entities/teams');
    return {
        ...teams,
        getCurrentTeamId: jest.fn(),
    };
});

jest.mock('@redux/selectors/entities/emojis', () => {
    const emojis = require.requireActual('@redux/selectors/entities/emojis');
    return {
        ...emojis,
        getCustomEmojisByName: jest.fn(),
    };
});

jest.mock('@redux/selectors/entities/posts', () => {
    const posts = require.requireActual('@redux/selectors/entities/posts');
    return {
        ...posts,
        makeGetReactionsForPost: () => jest.fn(),
    };
});

jest.mock('app/selectors/device', () => ({
    getDimensions: jest.fn(),
}));

describe('makeMapStateToProps', () => {
    const defaultState = {
        entities: {
            general: {
                serverVersion: '',
            },
        },
    };
    const defaultOwnProps = {
        post: {},
    };

    test('should not call canDeletePost if post is not defined', () => {
        const canDeletePost = jest.spyOn(PostUtils, 'canDeletePost');
        const mapStateToProps = makeMapStateToProps();
        const ownProps = {
            post: '',
        };

        const props = mapStateToProps(defaultState, ownProps);
        expect(props.canDelete).toBe(false);
        expect(canDeletePost).not.toHaveBeenCalled();
    });

    test('should not call canDeletePost if post is defined and channel is archived', () => {
        const canDeletePost = jest.spyOn(PostUtils, 'canDeletePost');
        const mapStateToProps = makeMapStateToProps();

        getChannel.mockReturnValueOnce({delete_at: 1}); //eslint-disable-line camelcase
        const props = mapStateToProps(defaultState, defaultOwnProps);
        expect(props.canDelete).toBe(false);
        expect(canDeletePost).not.toHaveBeenCalled();
    });

    test('should call canDeletePost if post is defined and channel is not archived', () => {
        const canDeletePost = jest.spyOn(PostUtils, 'canDeletePost');
        const mapStateToProps = makeMapStateToProps();

        getChannel.mockReturnValue({delete_at: 0}); //eslint-disable-line camelcase
        mapStateToProps(defaultState, defaultOwnProps);
        expect(canDeletePost).toHaveBeenCalledTimes(1);
    });
});