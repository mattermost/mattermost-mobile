// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-import-assign */

import {Permissions} from '@mm-redux/constants';
import * as channelSelectors from '@mm-redux/selectors/entities/channels';
import * as generalSelectors from '@mm-redux/selectors/entities/general';
import * as userSelectors from '@mm-redux/selectors/entities/users';
import * as commonSelectors from '@mm-redux/selectors/entities/common';
import * as teamSelectors from '@mm-redux/selectors/entities/teams';
import * as roleSelectors from '@mm-redux/selectors/entities/roles';
import * as deviceSelectors from 'app/selectors/device';
import * as preferencesSelectors from '@mm-redux/selectors/entities/preferences';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';

import {makeMapStateToProps} from './index';

jest.mock('@mm-redux/utils/post_utils');

channelSelectors.getChannel = jest.fn();
channelSelectors.getCurrentChannelId = jest.fn();
generalSelectors.getConfig = jest.fn();
generalSelectors.getLicense = jest.fn();
generalSelectors.hasNewPermissions = jest.fn();
userSelectors.getCurrentUserId = jest.fn();
commonSelectors.getCurrentUserId = jest.fn();
commonSelectors.getCurrentChannelId = jest.fn();
teamSelectors.getCurrentTeamId = jest.fn();
teamSelectors.getCurrentTeamUrl = jest.fn();
deviceSelectors.getDimensions = jest.fn();
preferencesSelectors.getTheme = jest.fn();
roleSelectors.haveIChannelPermission = jest.fn();

describe('makeMapStateToProps', () => {
    const baseState = {
        entities: {
            posts: {
                posts: {
                    post_id: {},
                },
                reactions: {
                    post_id: {},
                },
            },
            general: {
                serverVersion: '5.18',
            },
            channels: {myMembers: {}},
            teams: {myMembers: {}},
            roles: {roles: {}},
            users: {profiles: {}},
        },
    };

    const baseOwnProps = {
        post: {
            id: 'post_id',
        },
    };

    test('canFlag is false for system messages', () => {
        const ownProps = {
            ...baseOwnProps,
            isSystemMessage: true,
        };

        const mapStateToProps = makeMapStateToProps();
        const props = mapStateToProps(baseState, ownProps);
        expect(props.canFlag).toBe(false);
    });

    test('canFlag is true for non-system messages', () => {
        const ownProps = {
            ...baseOwnProps,
            isSystemMessage: false,
        };

        const mapStateToProps = makeMapStateToProps();
        const props = mapStateToProps(baseState, ownProps);
        expect(props.canFlag).toBe(true);
    });

    test('canMarkAsUnread is true when isMinimumServerVersion is 5.18v and channel not archived', () => {
        channelSelectors.getChannel = jest.fn().mockReturnValueOnce({
            delete_at: 0,
        });
        const mapStateToProps = makeMapStateToProps();
        const props = mapStateToProps(baseState, baseOwnProps);
        expect(isMinimumServerVersion(baseState.entities.general.serverVersion, 5, 18)).toBe(true);
        expect(props.canMarkAsUnread).toBe(true);
    });

    test('canMarkAsUnread is false when isMinimumServerVersion is 5.18v and channel is archived', () => {
        channelSelectors.getChannel = jest.fn().mockReturnValueOnce({
            delete_at: 1,
        });
        const mapStateToProps = makeMapStateToProps();
        const props = mapStateToProps(baseState, baseOwnProps);
        expect(isMinimumServerVersion(baseState.entities.general.serverVersion, 5, 18)).toBe(true);
        expect(props.canMarkAsUnread).toBe(false);
    });

    test('canMarkAsUnread is false when isMinimumServerVersion is not 5.18v and channel is not archived', () => {
        const state = {
            entities: {
                ...baseState.entities,
                general: {
                    serverVersion: '5.17',
                },
            },
        };

        channelSelectors.getChannel = jest.fn().mockReturnValueOnce({
            delete_at: 0,
        });

        const mapStateToProps = makeMapStateToProps();
        const props = mapStateToProps(state, baseOwnProps);
        expect(isMinimumServerVersion(state.entities.general.serverVersion, 5, 18)).toBe(false);
        expect(props.canMarkAsUnread).toBe(false);
    });

    test('canMarkAsUnread is false when isMinimumServerVersion is not 5.18v and channel is archived', () => {
        const state = {
            entities: {
                ...baseState.entities,
                general: {
                    serverVersion: '5.17',
                },
            },
        };

        channelSelectors.getChannel = jest.fn().mockReturnValueOnce({
            delete_at: 1,
        });

        const mapStateToProps = makeMapStateToProps();
        const props = mapStateToProps(state, baseOwnProps);
        expect(isMinimumServerVersion(state.entities.general.serverVersion, 5, 18)).toBe(false);
        expect(props.canMarkAsUnread).toBe(false);
    });

    test('haveIChannelPermission for canPost is not called when isMinimumServerVersion is not 5.22v', () => {
        const state = {
            entities: {
                ...baseState.entities,
                general: {
                    serverVersion: '5.21',
                },
            },
        };

        const mapStateToProps = makeMapStateToProps();
        mapStateToProps(state, baseOwnProps);
        expect(isMinimumServerVersion(state.entities.general.serverVersion, 5, 22)).toBe(false);
        expect(roleSelectors.haveIChannelPermission).not.toHaveBeenCalledWith(state, {
            channel: undefined,
            team: undefined,
            permission: Permissions.CREATE_POST,
            default: true,
        });
    });

    test('haveIChannelPermission for canPost is called when isMinimumServerVersion is 5.22v', () => {
        const state = {
            entities: {
                ...baseState.entities,
                general: {
                    serverVersion: '5.22',
                },
            },
        };

        const mapStateToProps = makeMapStateToProps();
        mapStateToProps(state, baseOwnProps);
        expect(isMinimumServerVersion(state.entities.general.serverVersion, 5, 22)).toBe(true);
        expect(roleSelectors.haveIChannelPermission).toHaveBeenCalledWith(state, {
            channel: undefined,
            team: undefined,
            permission: Permissions.CREATE_POST,
            default: true,
        });
    });
});
