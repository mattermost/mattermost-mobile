// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';

import React from 'react';
import {intlShape, injectIntl} from 'react-intl';
import {View} from 'react-native';

import {dismissModal} from '@actions/navigation';
import FormattedText from '@components/formatted_text';
import SlideUpPanel from '@components/slide_up_panel';
import {BOTTOM_MARGIN} from '@components/slide_up_panel/slide_up_panel';
import {GLOBAL_THREADS} from '@constants/screen';
import EventEmitter from '@mm-redux/utils/event_emitter';
import ThreadOption from '@screens/post_options/post_option';
import {OPTION_HEIGHT, getInitialPosition} from '@screens/post_options/post_options_utils';
import {t} from '@utils/i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Post} from '@mm-redux/types/posts';
import type {Theme} from '@mm-redux/types/theme';
import type {UserThread} from '@mm-redux/types/threads';
import type {UserProfile} from '@mm-redux/types/users';
import type {$ID} from '@mm-redux/types/utilities';

export type StateProps = {
    currentTeamName: string;
    currentTeamUrl: string;
    currentUserId: $ID<UserProfile>;
    deviceHeight: number;
    isFlagged: boolean;
    post: Post;
    theme: Theme;
    thread: UserThread;
};

export type DispatchProps = {
    actions: {
        flagPost: (postId: $ID<Post>) => void;
        setThreadFollow: (currentUserId: $ID<UserProfile>, threadId: $ID<UserThread>, newState: boolean) => void;
        setUnreadPost: (currentUserId: $ID<UserProfile>, postId: $ID<Post>, location: string) => void;
        showPermalink: (currentUserId: $ID<UserProfile>, teamName: string, postId: $ID<Post>) => void;
        unflagPost: (postId: $ID<Post>) => void;
        updateThreadRead: (currentUserId: $ID<UserProfile>, threadId: $ID<UserThread>, timestamp: number) => void;
    };
};

export type OwnProps = {
    rootId: $ID<Post>;
};

type Props = StateProps & DispatchProps & OwnProps & {
    intl: typeof intlShape;
};

function ThreadOptions({actions, currentTeamName, currentTeamUrl, currentUserId, deviceHeight, intl, isFlagged, post, theme, thread}: Props) {
    const style = getStyleSheet(theme);

    const slideUpPanelRef = React.useRef<any>();

    const close = async (cb?: () => void) => {
        await dismissModal();

        if (typeof cb === 'function') {
            requestAnimationFrame(cb);
        }
    };

    const closeWithAnimation = (cb?: () => void) => {
        if (slideUpPanelRef.current) {
            slideUpPanelRef.current.closeWithAnimation(cb);
        } else {
            close(cb);
        }
    };

    const getOption = (key: string, icon: string, message: Record<string, any>, onPress: () => void, destructive = false) => {
        const testID = `global_threads.options.${key}.action`;
        return (
            <ThreadOption
                testID={testID}
                key={key}
                icon={icon}
                text={intl.formatMessage(message)}
                onPress={onPress}
                destructive={destructive}
                theme={theme}
            />
        );
    };

    //
    // Option: Reply
    //
    const handleReply = () => {
        closeWithAnimation(() => {
            EventEmitter.emit('goToThread', post);
        });
    };

    const getReplyOption = () => {
        const key = 'reply';
        const icon = 'reply-outline';
        const message = {id: t('mobile.post_info.reply'), defaultMessage: 'Reply'};
        const onPress = handleReply;
        return getOption(key, icon, message, onPress);
    };

    //
    // Option: Unfollow thread
    //
    const handleUnfollowThread = () => {
        closeWithAnimation(() => {
            actions.setThreadFollow(currentUserId, thread.id, false);
        });
    };

    const getUnfollowThread = () => {
        const key = 'unfollow';
        const icon = 'message-minus-outline';
        const message = {id: t('global_threads.options.unfollow'), defaultMessage: 'Unfollow Thread'};
        const onPress = handleUnfollowThread;
        return getOption(key, icon, message, onPress);
    };

    //
    // Option: Open in Channel
    //
    const handleOpenInChannel = () => {
        closeWithAnimation(() => {
            actions.showPermalink(intl, currentTeamName, post.id);
        });
    };

    const getOpenInChannel = () => {
        const key = 'open_in_channel';
        const icon = 'globe';
        const message = {id: t('global_threads.options.open_in_channel'), defaultMessage: 'Open in Channel'};
        const onPress = handleOpenInChannel;
        return getOption(key, icon, message, onPress);
    };

    //
    // Option: Mark as Read
    //
    const handleMarkAsRead = () => {
        closeWithAnimation(() => {
            actions.updateThreadRead(
                currentUserId,
                post.id,
                Date.now(),
            );
        });
    };

    const handleMarkAsUnread = () => {
        closeWithAnimation(() => {
            actions.setUnreadPost(currentUserId, post.id, GLOBAL_THREADS);
        });
    };

    const getMarkAsUnreadOption = () => {
        const icon = 'mark-as-unread';
        let key;
        let message;
        let onPress;
        if (thread.unread_replies) {
            key = 'mark_as_read';
            message = {id: t('global_threads.options.mark_as_read'), defaultMessage: 'Mark as Read'};
            onPress = handleMarkAsRead;
        } else {
            key = 'mark_as_unread';
            message = {id: t('mobile.post_info.mark_unread'), defaultMessage: 'Mark as Unread'};
            onPress = handleMarkAsUnread;
        }
        return getOption(key, icon, message, onPress);
    };

    //
    // Option: Flag/Unflag
    //
    const handleFlagPost = () => {
        closeWithAnimation(() => {
            actions.flagPost(post.id);
        });
    };

    const handleUnflagPost = () => {
        closeWithAnimation(() => {
            actions.unflagPost(post.id);
        });
    };

    const getFlagOption = () => {
        let key;
        let message;
        let onPress;
        const icon = 'bookmark-outline';

        if (isFlagged) {
            key = 'unflag';
            message = {id: t('mobile.post_info.unflag'), defaultMessage: 'Unsave'};
            onPress = handleUnflagPost;
        } else {
            key = 'flagged';
            message = {id: t('mobile.post_info.flag'), defaultMessage: 'Save'};
            onPress = handleFlagPost;
        }

        return getOption(key, icon, message, onPress);
    };

    //
    // Option: Copy Link
    //
    const handleCopyPermalink = () => {
        closeWithAnimation(() => {
            const permalink = `${currentTeamUrl}/pl/${post.id}`;
            Clipboard.setString(permalink);
        });
    };

    const getCopyPermalink = () => {
        const key = 'permalink';
        const icon = 'link-variant';
        const message = {id: t('get_post_link_modal.title'), defaultMessage: 'Copy Link'};
        const onPress = handleCopyPermalink;
        return getOption(key, icon, message, onPress);
    };

    const options = [
        getReplyOption(),
        getUnfollowThread(),
        getOpenInChannel(),
        getMarkAsUnreadOption(),
        getFlagOption(),
        getCopyPermalink(),
    ].filter((option) => option !== null);

    const marginFromTop = deviceHeight - BOTTOM_MARGIN - ((options.length + 2) * OPTION_HEIGHT);
    const initialPosition = getInitialPosition(deviceHeight, marginFromTop);

    return (
        <View
            testID='global_threads.item.options'
            style={style.container}
        >
            <SlideUpPanel
                allowStayMiddle={false}
                marginFromTop={marginFromTop > 0 ? marginFromTop : 0}
                onRequestClose={close}
                initialPosition={initialPosition}
                key={marginFromTop}
                ref={slideUpPanelRef}
                theme={theme}
            >
                <FormattedText
                    id='global_threads.options.title'
                    defaultMessage='THREAD ACTIONS'
                    style={style.title}
                />
                {options}
            </SlideUpPanel>
        </View>
    );
}

export {ThreadOptions};
export default injectIntl(ThreadOptions);

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        title: {
            color: changeOpacity(theme.centerChannelColor, 0.65),
            fontSize: 12,
            paddingLeft: 16,
            paddingTop: 16,
            paddingBottom: 8,
        },
    };
});
