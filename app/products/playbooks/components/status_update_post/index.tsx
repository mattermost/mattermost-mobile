// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Markdown from '@components/markdown';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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
    const style = getStyleSheet(theme);
    const blockStyles = getMarkdownBlockStyles(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const intl = useIntl();

    const updatePosted = intl.formatMessage({
        id: 'playbooks.status_update_post.update',
        defaultMessage: '@{authorUsername} posted an update for [{runName}]({link})',
    }, {authorUsername, runName, link: `/playbooks/runs/${playbookRunId}`});
    const tasks = intl.formatMessage({
        id: 'playbooks.status_update_post.num_tasks',
        defaultMessage: '**{numTasksChecked, number}** of **{numTasks, number}** {numTasks, plural, =1 {task} other {tasks}} checked',
    }, {numTasksChecked, numTasks});
    const participants = intl.formatMessage({
        id: 'playbooks.status_update_post.participants',
        defaultMessage: '{numParticipants, number} {numParticipants, plural, =1 {participant} other {participants}}',
    }, {numParticipants: participantIds.length});

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
                            style={{marginRight: 5}}
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

                    <View style={{flexDirection: 'row'}}>
                        <CompassIcon
                            name='account-multiple-outline'
                            size={14}
                            color={changeOpacity(theme.centerChannelColor, 0.64)}
                            style={{marginRight: 5}}
                        />
                        <Markdown
                            baseTextStyle={style.detailsText}
                            value={participants}
                            textStyles={textStyles}
                            theme={theme}
                            location={location}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
};

export default StatusUpdatePost;
