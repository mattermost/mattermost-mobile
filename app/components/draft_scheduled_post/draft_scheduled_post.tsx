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
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {DRAFT_OPTIONS_BUTTON} from '@screens/draft_scheduled_post_options';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@screens/global_drafts/constants';
import {openAsBottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import DraftAndScheduledPostContainer from './draft_scheduled_post_container';

import type {ScheduledPostModel} from '@database/models/server';
import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channel: ChannelModel;
    location: string;
    postReceiverUser?: UserModel;
    post: DraftModel | ScheduledPostModel;
    layoutWidth: number;
    isPostPriorityEnabled: boolean;
    draftType: DraftType;
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
}) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const showPostPriority = Boolean(isPostPriorityEnabled && post.metadata?.priority && post.metadata?.priority?.priority);

    const onLongPress = useCallback(() => {
        Keyboard.dismiss();
        const title = isTablet ? intl.formatMessage({id: 'draft.options.title', defaultMessage: 'Draft Options'}) : 'Draft Options';
        if (draftType === DRAFT_TYPE_DRAFT) {
            openAsBottomSheet({
                closeButtonId: DRAFT_OPTIONS_BUTTON,
                screen: Screens.DRAFT_SCHEDULED_POST_OPTIONS,
                theme,
                title,
                props: {channel, rootId: post.rootId, draftType: DRAFT_TYPE_DRAFT, draft: post, draftReceiverUserName: postReceiverUser?.username},
            });
            return;
        }
        openAsBottomSheet({
            closeButtonId: DRAFT_OPTIONS_BUTTON,
            screen: Screens.DRAFT_SCHEDULED_POST_OPTIONS,
            theme,
            title,
            props: {channel, rootId: post.rootId, draftType: DRAFT_TYPE_SCHEDULED, draft: post, draftReceiverUserName: postReceiverUser?.username},
        });
    }, [isTablet, intl, draftType, theme, channel, post, postReceiverUser?.username]);

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
                    <View style={style.errorLine}/>
                }
                <View
                    style={style.postContainer}
                >
                    <DraftAndScheduledPostHeader
                        channel={channel}
                        postReceiverUser={postReceiverUser}
                        rootId={post.rootId}
                        testID='draft_post.channel_info'
                        updateAt={post.updateAt}
                        draftType={draftType}
                        postScheduledAt={(post as ScheduledPostModel).scheduledAt}
                        scheduledPostErrorCode={(post as ScheduledPostModel).errorCode}
                    />
                    {showPostPriority && post.metadata?.priority &&
                    <View style={style.postPriority}>
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
