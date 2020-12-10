// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-import-assign */

import {Permissions} from '@mm-redux/constants';
import * as channelSelectors from '@mm-redux/selectors/entities/channels';
import * as generalSelectors from '@mm-redux/selectors/entities/general';
import * as commonSelectors from '@mm-redux/selectors/entities/common';
import * as teamSelectors from '@mm-redux/selectors/entities/teams';
import * as roleSelectors from '@mm-redux/selectors/entities/roles';
import * as deviceSelectors from 'app/selectors/device';
import * as preferencesSelectors from '@mm-redux/selectors/entities/preferences';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';

import {makeMapStateToProps, OwnProps} from './index';
import {GlobalState} from '@mm-redux/types/store';
import {Dictionary, IDMappedObjects, RelationOneToOne} from '@mm-redux/types/utilities';
import {Post} from '@mm-redux/types/posts';
import {Reaction} from '@mm-redux/types/reactions';

jest.mock('@mm-redux/utils/post_utils');

Object.defineProperty(channelSelectors, 'getChannel', {value: jest.fn()});
Object.defineProperty(generalSelectors, 'getConfig', {value: jest.fn()});
Object.defineProperty(generalSelectors, 'getLicense', {value: jest.fn()});
Object.defineProperty(generalSelectors, 'hasNewPermissions', {value: jest.fn()});
Object.defineProperty(commonSelectors, 'getCurrentUserId', {value: jest.fn()});
Object.defineProperty(commonSelectors, 'getCurrentChannelId', {value: jest.fn()});
Object.defineProperty(teamSelectors, 'getCurrentTeamId', {value: jest.fn()});
Object.defineProperty(teamSelectors, 'getCurrentTeamUrl', {value: jest.fn()});
Object.defineProperty(deviceSelectors, 'getDimensions', {value: jest.fn()});
Object.defineProperty(preferencesSelectors, 'getTheme', {value: jest.fn()});
Object.defineProperty(roleSelectors, 'haveIChannelPermission', {value: jest.fn()});

describe('makeMapStateToProps', () => {
    const baseState = {
        entities: {
            posts: {
                posts: {
                    post_id: {} as Post,
                } as IDMappedObjects<Post>,
                reactions: {
                    post_id: {},
                } as RelationOneToOne<Post, Dictionary<Reaction>>,
            },
            general: {
                serverVersion: '5.18',
            },
            channels: {myMembers: {}},
            teams: {myMembers: {}},
            roles: {roles: {}},
            users: {profiles: {}},
        },
    } as GlobalState;

    const baseOwnProps = {
        post: {
            id: 'post_id',
        },
    } as OwnProps;

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
        Object.defineProperty(channelSelectors, 'getChannel', {value: jest.fn().mockReturnValueOnce({
            delete_at: 0,
        })});
        const mapStateToProps = makeMapStateToProps();
        const props = mapStateToProps(baseState, baseOwnProps);
        expect(isMinimumServerVersion(baseState.entities.general.serverVersion, 5, 18)).toBe(true);
        expect(props.canMarkAsUnread).toBe(true);
    });

    test('canMarkAsUnread is false when isMinimumServerVersion is 5.18v and channel is archived', () => {
        Object.defineProperty(channelSelectors, 'getChannel', {value: jest.fn().mockReturnValueOnce({
            delete_at: 1,
        })});
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
        } as GlobalState;

        Object.defineProperty(channelSelectors, 'getChannel', {value: jest.fn().mockReturnValueOnce({
            delete_at: 0,
        })});

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
        } as GlobalState;

        Object.defineProperty(channelSelectors, 'getChannel', {value: jest.fn().mockReturnValueOnce({
            delete_at: 1,
        })});

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
        } as GlobalState;

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
        } as GlobalState;

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
