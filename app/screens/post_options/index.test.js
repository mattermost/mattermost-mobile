// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {makeMapStateToProps} from './index';

import * as channelSelectors from 'mattermost-redux/selectors/entities/channels';
import * as generalSelectors from 'mattermost-redux/selectors/entities/general';
import * as userSelectors from 'mattermost-redux/selectors/entities/users';
import * as commonSelectors from 'mattermost-redux/selectors/entities/common';
import * as teamSelectors from 'mattermost-redux/selectors/entities/teams';
import * as deviceSelectors from 'app/selectors/device';
import * as preferencesSelectors from 'mattermost-redux/selectors/entities/preferences';

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
deviceSelectors.isLandscape = jest.fn();
preferencesSelectors.getTheme = jest.fn();

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

    test('canMarkAsUnread is true when isMinimumServerVersion is 5.18v', () => {
        const mapStateToProps = makeMapStateToProps();
        const props = mapStateToProps(baseState, baseOwnProps);
        expect(props.canMarkAsUnread).toBe(true);
    });

    test('canMarkAsUnread is false when isMinimumServerVersion is not 5.18v', () => {
        const state = {
            entities: {
                ...baseState.entities,
                general: {
                    serverVersion: '5.17',
                },
            },
        };

        const mapStateToProps = makeMapStateToProps();
        const props = mapStateToProps(state, baseOwnProps);
        expect(props.canMarkAsUnread).toBe(false);
    });
});
