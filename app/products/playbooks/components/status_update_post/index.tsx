// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {fetchUsersByIds} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Markdown from '@components/markdown';
import {useServerUrl} from '@context/server';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Participants from './participants';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    location: AvailableScreens;
    post: PostModel;
    theme: Theme;
};

type StatusUpdatePostProps = {
    authorUsername: string;
    numTasks: number;
    numTasksChecked: number;
    participantIds: string[];
    playbookRunId: string;
    runName: string;
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
    const {authorUsername, numTasks, numTasksChecked, participantIds, playbookRunId, runName} = post.props as StatusUpdatePostProps;
    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);
    const blockStyles = getMarkdownBlockStyles(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const intl = useIntl();

    useEffect(() => {
        fetchUsersByIds(serverUrl, participantIds);

        // Only do this on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                blockStyles={blockStyles}
                channelId={post.channelId}
                postId={post.id}
                textStyles={textStyles}
                value={updatePosted}
                mentionKeys={authorUsername ? [{key: authorUsername, caseSensitive: false}] : []}
                theme={theme}
                location={location}
            />
            <View style={style.updateContainer}>
                <Markdown
                    baseTextStyle={style.message}
                    blockStyles={blockStyles}
                    channelId={post.channelId}
                    postId={post.id}
                    textStyles={textStyles}
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
                            textStyles={textStyles}
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
                        textStyles={textStyles}
                    />
                </View>
            </View>
        </View>
    );
};

export default StatusUpdatePost;
