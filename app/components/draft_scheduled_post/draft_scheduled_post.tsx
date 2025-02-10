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
import {DRAFT_OPTIONS_BUTTON} from '@screens/draft_options';
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
    postType: 'draft' | 'scheduled';
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
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
    };
});

const DraftAndScheduledPost: React.FC<Props> = ({
    channel,
    location,
    post,
    postReceiverUser,
    layoutWidth,
    isPostPriorityEnabled,
    postType,
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
        if (postType === 'draft') {
            openAsBottomSheet({
                closeButtonId: DRAFT_OPTIONS_BUTTON,
                screen: Screens.DRAFT_OPTIONS,
                theme,
                title,
                props: {channel, rootId: post.rootId, draft: post, draftReceiverUserName: postReceiverUser?.username},
            });
        }
    }, [isTablet, intl, postType, theme, channel, post, postReceiverUser?.username]);

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
            <View
                style={style.container}
            >
                <DraftAndScheduledPostHeader
                    channel={channel}
                    postReceiverUser={postReceiverUser}
                    rootId={post.rootId}
                    testID='draft_post.channel_info'
                    updateAt={post.updateAt}
                    postType={postType}
                    postScheduledAt={(post as ScheduledPostModel).scheduledAt}
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

        </TouchableHighlight>
    );
};

export default DraftAndScheduledPost;
