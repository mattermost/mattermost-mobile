// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';
import {Keyboard} from 'react-native';

import {showModalOverCurrentContext} from '@actions/navigation';
import {loadChannelsByTeamName} from '@actions/views/channel';
import {selectFocusedPostId} from '@mm-redux/actions/posts';
import type {DispatchFunc} from '@mm-redux/types/actions';
import {permalinkBadTeam} from '@utils/general';
import {changeOpacity} from '@utils/theme';

export let showingPermalink = false;

export function showPermalink(intl: typeof intlShape, teamName: string, postId: string, openAsPermalink = true) {
    return async (dispatch: DispatchFunc) => {
        const loadTeam = await dispatch(loadChannelsByTeamName(teamName, permalinkBadTeam.bind(null, intl)));

        if (!loadTeam.error) {
            Keyboard.dismiss();
            dispatch(selectFocusedPostId(postId));

            if (!showingPermalink) {
                const screen = 'Permalink';
                const passProps = {
                    isPermalink: openAsPermalink,
                    onClose: () => {
                        dispatch(closePermalink());
                    },
                    teamName,
                };

                const options = {
                    layout: {
                        componentBackgroundColor: changeOpacity('#000', 0.2),
                    },
                };

                showingPermalink = true;
                showModalOverCurrentContext(screen, passProps, options);
            }
        }
        return {};
    };
}

export function closePermalink() {
    return async (dispatch: DispatchFunc) => {
        showingPermalink = false;
        return dispatch(selectFocusedPostId(''));
    };
}
