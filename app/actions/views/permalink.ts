// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';
import {Alert, Keyboard} from 'react-native';

import {showModalOverCurrentContext} from '@actions/navigation';
import {loadChannelsByTeamName} from '@actions/views/channel';
import {getPost} from '@actions/views/post';
import {selectFocusedPostId} from '@mm-redux/actions/posts';
import {getChannel, isChannelMember, joinChannel} from '@mm-redux/actions/channels';
import {General} from '@mm-redux/constants';
import type {DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {permalinkBadTeam} from '@utils/general';
import {changeOpacity} from '@utils/theme';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getCurrentUserRoles} from '@mm-redux/selectors/entities/users';
import {isSystemAdmin} from '@mm-redux/utils/user_utils';

export let showingPermalink = false;

export function showPermalink(intl: typeof intlShape, teamName: string, postId: string, openAsPermalink = true) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const loadTeam = await dispatch(loadChannelsByTeamName(teamName, permalinkBadTeam.bind(null, intl)));
        if (!loadTeam.error) {
            Keyboard.dismiss();

            // Warn before joining private channels through permalink
            const state = getState();
            const currentUserId = getCurrentUserId(state);
            const roles = currentUserId ? getCurrentUserRoles(state) : '';
            if (isSystemAdmin(roles)) {
                const postData = await dispatch(getPost(postId));
                if (postData.error) {
                    return {error: postData.error};
                }
                const channelId = postData.data?.channel_id;
                if (channelId) {
                    const {data: isMember} = await dispatch(isChannelMember(channelId));
                    if (!isMember) {
                        const {data: channelData, error: channelError} = await dispatch(getChannel(channelId));
                        if (channelError) {
                            return {error: channelError};
                        }
                        if (channelData.type === General.PRIVATE_CHANNEL) {
                            Alert.alert(
                                intl.formatMessage({
                                    id: 'permalink.show_dialog_warn.title',
                                    defaultMessage: 'Private Channel',
                                }),
                                intl.formatMessage({
                                    id: 'permalink.show_dialog_warn.description',
                                    defaultMessage: 'You must join "{channel}" to view this post.',
                                }, {
                                    channel: channelData.name,
                                }),
                                [
                                    {
                                        text: intl.formatMessage({
                                            id: 'permalink.show_dialog_warn.cancel',
                                            defaultMessage: 'Cancel',
                                        }),
                                    },
                                    {
                                        text: intl.formatMessage({
                                            id: 'permalink.show_dialog_warn.join',
                                            defaultMessage: 'Join',
                                        }),
                                        onPress: async () => {
                                            await dispatch(joinChannel(currentUserId, teamName, channelId, channelData.name));
                                            dispatch(processShowPermaLink(postId, openAsPermalink));
                                        },
                                    },
                                ],
                            );
                            return null;
                        }
                    }
                }
            }
            dispatch(processShowPermaLink(postId, openAsPermalink));
        }
        return null;
    };
}

function processShowPermaLink(postId: string, openAsPermalink: boolean) {
    return async (dispatch: DispatchFunc) => {
        dispatch(selectFocusedPostId(postId));
        if (!showingPermalink) {
            const screen = 'Permalink';
            const passProps = {
                isPermalink: openAsPermalink,
                onClose: () => {
                    dispatch(closePermalink());
                },
            };

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