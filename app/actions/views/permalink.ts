// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';
import {Keyboard} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {showModalOverCurrentContext} from '@actions/navigation';
import {loadChannelsByTeamName} from '@actions/views/channel';
import {getPost as fetchPost, selectFocusedPostId} from '@mm-redux/actions/posts';
import {getPost} from '@mm-redux/selectors/entities/posts';
import {isCollapsedThreadsEnabled} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeam} from '@mm-redux/selectors/entities/teams';
import {permalinkBadTeam} from '@utils/general';
import {changeOpacity} from '@utils/theme';

import type {DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';

let showingPermalink = false;

export function showPermalink(intl: typeof intlShape, teamName: string, postId: string, openAsPermalink = true) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();

        let name = teamName;
        if (!name) {
            name = getCurrentTeam(state).name;
        }

        const loadTeam = await dispatch(loadChannelsByTeamName(name, permalinkBadTeam.bind(null, intl)));

        let isThreadPost;

        const collapsedThreadsEnabled = isCollapsedThreadsEnabled(state);
        if (collapsedThreadsEnabled) {
            let post = getPost(state, postId);
            if (!post) {
                const {data} = await dispatch(fetchPost(postId));
                if (data) {
                    post = data;
                }
            }
            if (post) {
                isThreadPost = Boolean(post.root_id);
            } else {
                return {};
            }
        }

        if (!loadTeam.error) {
            Keyboard.dismiss();
            dispatch(selectFocusedPostId(postId));

            const screen = 'Permalink';
            const passProps = {
                isPermalink: openAsPermalink,
                isThreadPost,
                focusedPostId: postId,
                teamName,
            };

            if (showingPermalink) {
                Navigation.updateProps(screen, passProps);
                return {};
            }

            const options = {
                layout: {
                    componentBackgroundColor: changeOpacity('#000', 0.2),
                },
            };

            showingPermalink = true;
            showModalOverCurrentContext(screen, passProps, options);
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
