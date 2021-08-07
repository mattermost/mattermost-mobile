// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// import Clipboard from '@react-native-community/clipboard';

import React from 'react';
import {intlShape, injectIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import SlideUpPanel from '@components/slide_up_panel';
import {BOTTOM_MARGIN} from '@components/slide_up_panel/slide_up_panel';
import {UserThread} from '@mm-redux/types/threads';
import {UserProfile} from '@mm-redux/types/users';
import {$ID} from '@mm-redux/types/utilities';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {OPTION_HEIGHT, getInitialPosition} from '@screens/post_options/post_options_utils';
import {t} from '@utils/i18n';

import ThreadOption from './thread_option';

import type {Post} from '@mm-redux/types/posts';
import type {Theme} from '@mm-redux/types/preferences';

type StateProps = {
    currentUserId: $ID<UserProfile>;
    deviceHeight: number;
    isFlagged: boolean;
    theme: Theme;
};

type DispatchProps = {
    actions: {
        setThreadFollow: (currentUserId: $ID<UserProfile>, threadId: $ID<UserThread>, newState: boolean) => void;
    };
};

type OwnProps = {
    post: Post;
    thread: UserThread;
};

type Props = StateProps & DispatchProps & OwnProps & {
    intl: typeof intlShape;
};

function ThreadOptions({actions, currentUserId, deviceHeight, intl, isFlagged, post, theme, thread}: Props) {
    const closeWithAnimation = (cb?: () => void) => {
        if (this.slideUpPanel) {
            this.slideUpPanel.closeWithAnimation(cb);
        } else {
            this.close(cb);
        }
    };

    const getOption = (key: string, icon: string, message: Record<string, any>, onPress: () => void, destructive = false) => {
        const testID = `post.options.${key}.action`;
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

    // Reply
    const handleReply = () => {
        this.closeWithAnimation(() => {
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

    // Unfollow Thread
    const handleToggleFollow = () => {
        actions.setThreadFollow(currentUserId, thread.id, false);
        closeWithAnimation();
    };

    const getUnfollowThread = () => {
        const key = 'follow';
        const icon = 'message-minus-outline';
        const message = {id: t('threads.unfollowThread'), defaultMessage: 'Unfollow Thread'};
        const onPress = handleToggleFollow;
        return getOption(key, icon, message, onPress);
    };

    const getOpenInChannel = () => {
        return null;
    };

    const getMarkAsUnreadOption = () => {
        return null;
    };

    const getFlagOption = () => {
        let key;
        let message;
        let onPress;
        const icon = 'bookmark-outline';

        if (isFlagged) {
            key = 'unflag';
            message = {id: t('mobile.post_info.unflag'), defaultMessage: 'Unsave'};
            onPress = this.handleUnflagPost;
        } else {
            key = 'flagged';
            message = {id: t('mobile.post_info.flag'), defaultMessage: 'Save'};
            onPress = this.handleFlagPost;
        }

        return getOption(key, icon, message, onPress);
    };

    const handleCopyPermalink = () => {
        return null;
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

    const marginFromTop = deviceHeight - BOTTOM_MARGIN - ((options.length + 1) * OPTION_HEIGHT);
    const initialPosition = getInitialPosition(deviceHeight, marginFromTop);

    return (
        <View
            testID='global_threads.item.options'
            style={style.container}
        >
            <SlideUpPanel
                allowStayMiddle={false}
                marginFromTop={marginFromTop > 0 ? marginFromTop : 0}
                onRequestClose={this.close}
                initialPosition={initialPosition}
                key={marginFromTop}
                theme={theme}
            >
                {options}
            </SlideUpPanel>
        </View>
    );
}

export {ThreadOptions};
export default injectIntl(ThreadOptions);

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
});
