// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, TouchableHighlight, View} from 'react-native';

import {switchToThread} from '@actions/local/thread';
import {switchToChannelById} from '@actions/remote/channel';
import DraftAndScheduledPostHeader from '@components/draft_scheduled_post_header';
import Header from '@components/post_draft/draft_input/header';
import {Screens} from '@constants';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@constants/draft';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {DRAFT_OPTIONS_BUTTON} from '@screens/draft_scheduled_post_options';
import {openAsBottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import DraftAndScheduledPostContainer from './draft_scheduled_post_container';

import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channel: ChannelModel;
    location: AvailableScreens;
    postReceiverUser?: UserModel;
    post: DraftModel | ScheduledPostModel;
    layoutWidth: number;
    isPostPriorityEnabled: boolean;
    draftType: DraftType;
    firstItem?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            position: 'relative',
        },
        postContainer: {
            paddingHorizontal: 20,
            paddingVertical: 16,
            width: '100%',
        },
        postContainerBorderTop: {
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderTopWidth: 1,
        },
        pressInContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        postPriority: {
            marginTop: 10,
            marginLeft: -12,
        },
        errorLine: {
            backgroundColor: theme.errorTextColor,
            position: 'absolute',
            width: 1,
            top: 0,
            left: 0,
            height: '100%',
        },
    };
});

const DraftAndScheduledPost: React.FC<Props> = ({
    channel,
    location,
    post,
    postReceiverUser,
    layoutWidth,
    isPostPriorityEnabled,
    draftType,
    firstItem,
}) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const showPostPriority = Boolean(isPostPriorityEnabled && post.metadata?.priority && post.metadata?.priority?.priority);

    const onLongPress = useCallback(() => {
        Keyboard.dismiss();
        let title;
        if (draftType === DRAFT_TYPE_DRAFT) {
            title = intl.formatMessage({id: 'draft.options.title', defaultMessage: 'Draft Options'});
        } else {
            title = intl.formatMessage({id: 'scheduled_post.options.title', defaultMessage: 'Message actions'});
        }
        openAsBottomSheet({
            closeButtonId: DRAFT_OPTIONS_BUTTON,
            screen: Screens.DRAFT_SCHEDULED_POST_OPTIONS,
            theme,
            title,
            props: {channel, rootId: post.rootId, draftType, draft: post, draftReceiverUserName: postReceiverUser?.username},
        });
    }, [intl, draftType, theme, channel, post, postReceiverUser?.username]);

    const onPress = useCallback(() => {
        if (post.rootId) {
            switchToThread(serverUrl, post.rootId, false);
            return;
        }
        switchToChannelById(serverUrl, channel.id, channel.teamId, false);
    }, [channel.id, channel.teamId, post.rootId, serverUrl]);

    return (
        <TouchableHighlight
            onLongPress={onLongPress}
            onPress={onPress}
            underlayColor={changeOpacity(theme.centerChannelColor, 0.1)}
            testID='draft_post'
        >
            <View style={style.container}>
                {draftType === DRAFT_TYPE_SCHEDULED && (post as ScheduledPostModel).errorCode !== '' &&
                    <View
                        style={style.errorLine}
                        testID='draft_post.error_line'
                    />
                }
                <View
                    style={[style.postContainer, firstItem ? null : style.postContainerBorderTop]}
                >
                    <DraftAndScheduledPostHeader
                        channel={channel}
                        postReceiverUser={postReceiverUser}
                        rootId={post.rootId}
                        testID='draft_post.channel_info'
                        updateAt={post.updateAt}
                        draftType={draftType}
                        postScheduledAt={'scheduledAt' in post ? post.scheduledAt : undefined}
                        scheduledPostErrorCode={'errorCode' in post ? post.errorCode : undefined}
                    />
                    {showPostPriority && post.metadata?.priority &&
                    <View
                        style={style.postPriority}
                        testID='draft_post.priority'
                    >
                        <Header
                            noMentionsError={false}
                            postPriority={post.metadata?.priority}
                        />
                    </View>
                    }
                    <DraftAndScheduledPostContainer
                        post={post}
                        location={location}
                        layoutWidth={layoutWidth}
                    />
                </View>
            </View>

        </TouchableHighlight>
    );
};

export default DraftAndScheduledPost;
