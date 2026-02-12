// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {fetchUsersByIds} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Markdown from '@components/markdown';
import {useServerUrl} from '@context/server';
import useDidMount from '@hooks/did_mount';
import {isPostStatusUpdateProps} from '@playbooks/utils/types';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Participants from './participants';

import type {PostStatusUpdateProps} from '@playbooks/types/post';
import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    location: AvailableScreens;
    post: PostModel;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        messageContainer: {
            width: '100%',
        },
        icon: {
            marginRight: 5,
        },
        reply: {
            paddingRight: 10,
        },
        message: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
            lineHeight: undefined, // remove line height, not needed and causes problems with md images
        },
        pendingPost: {
            opacity: 0.5,
        },
        updateContainer: {
            marginTop: 5,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            padding: 12,
            borderRadius: 4,
        },
        updateSeparator: {
            width: '100%',
            height: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
            marginVertical: 10,
        },
        detailsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        row: {
            flexDirection: 'row',
        },
        detailsText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        detailsSeparator: {
            color: changeOpacity(theme.centerChannelColor, 0.24),
            ...typography('Body', 75),
        },
    };
});

const StatusUpdatePost = ({location, post, theme}: Props) => {
    let statusUpdateProps: PostStatusUpdateProps | undefined;

    if (isPostStatusUpdateProps(post.props)) {
        statusUpdateProps = post.props;
    }

    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);
    const intl = useIntl();

    useDidMount(() => {
        if (statusUpdateProps) {
            fetchUsersByIds(serverUrl, statusUpdateProps.participantIds);
        }
    });

    if (!statusUpdateProps) {
        return (
            <View style={style.messageContainer}>
                <Markdown
                    baseTextStyle={style.message}
                    channelId={post.channelId}
                    postId={post.id}
                    value={intl.formatMessage({id: 'playbooks.status_update_post.invalid_status_update_props', defaultMessage: 'Playbooks status update post with invalid properties'})}
                    theme={theme}
                    location={location}
                />
            </View>
        );
    }

    const {authorUsername, numTasks, numTasksChecked, participantIds, playbookRunId, runName} = statusUpdateProps;
    const updatePosted = intl.formatMessage({
        id: 'playbooks.status_update_post.update',
        defaultMessage: '@{authorUsername} posted an update for [{runName}]({link})',
    }, {authorUsername, runName, link: `/playbooks/runs/${playbookRunId}`});
    const tasks = intl.formatMessage({
        id: 'playbooks.status_update_post.num_tasks',
        defaultMessage: '**{numTasksChecked, number}** of **{numTasks, number}** {numTasks, plural, =1 {task} other {tasks}} checked',
    }, {numTasksChecked, numTasks});

    return (
        <View style={style.messageContainer}>
            <Markdown
                baseTextStyle={style.message}
                channelId={post.channelId}
                postId={post.id}
                value={updatePosted}
                theme={theme}
                location={location}
            />
            <View style={style.updateContainer}>
                <Markdown
                    baseTextStyle={style.message}
                    channelId={post.channelId}
                    postId={post.id}
                    value={post.message}
                    theme={theme}
                    location={location}
                />
                <View style={style.updateSeparator}/>
                <View style={style.detailsContainer}>
                    <View style={style.row}>
                        <CompassIcon
                            name='check-all'
                            size={14}
                            color={changeOpacity(theme.centerChannelColor, 0.64)}
                            style={style.icon}
                        />
                        <Markdown
                            baseTextStyle={style.detailsText}
                            value={tasks}
                            theme={theme}
                            location={location}
                        />
                    </View>

                    <Text style={style.detailsSeparator}>
                        {'•'}
                    </Text>

                    <Participants
                        participantIds={participantIds}
                        location={location}
                        baseTextStyle={style.detailsText}
                    />
                </View>
            </View>
        </View>
    );
};

export default StatusUpdatePost;
