// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {deletePostsForChannel} from '@actions/local/channel';
import {fetchPostsForChannel} from '@actions/remote/post';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateBack} from '@screens/navigation';
import {logError} from '@utils/log';

const messages = defineMessages({
    label: {
        id: 'channel_info.reset_posts',
        defaultMessage: 'Reset cached messages',
    },
    confirmTitle: {
        id: 'channel_info.reset_posts.confirm.title',
        defaultMessage: 'Reset cached messages?',
    },
    confirmBody: {
        id: 'channel_info.reset_posts.confirm.body',
        defaultMessage: 'This clears the locally stored messages for this channel and downloads them again from the server. Use this if the channel looks empty or messages appear to be missing.',
    },
    cancel: {
        id: 'channel_info.reset_posts.confirm.cancel',
        defaultMessage: 'Cancel',
    },
    confirm: {
        id: 'channel_info.reset_posts.confirm.button',
        defaultMessage: 'Reset',
    },
});

type Props = {
    channelId: string;
};

const ResetChannelPosts = ({channelId}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const doReset = useCallback(async () => {
        try {
            // Clears the channel's local posts + PostsInChannel intervals and resets
            // lastFetchedAt, then re-fetches from the server (a clean page-0 fetch that
            // excludes deleted posts). This recovers a channel left blank by an empty/orphaned
            // interval, regardless of how it got into that state.
            await deletePostsForChannel(serverUrl, channelId);
            await fetchPostsForChannel(serverUrl, channelId);
        } catch (error) {
            logError('Failed to reset channel posts', error);
        }

        // Dismiss Channel Info so the user lands back on the (now-repopulated) channel.
        await navigateBack();
    }, [serverUrl, channelId]);

    const onPress = usePreventDoubleTap(useCallback(() => {
        Alert.alert(
            intl.formatMessage(messages.confirmTitle),
            intl.formatMessage(messages.confirmBody),
            [
                {text: intl.formatMessage(messages.cancel), style: 'cancel'},
                {text: intl.formatMessage(messages.confirm), onPress: doReset},
            ],
        );
    }, [intl, doReset]));

    return (
        <OptionItem
            action={onPress}
            label={intl.formatMessage(messages.label)}
            icon='refresh'
            type='default'
            testID='channel_info.options.reset_channel_posts.option'
        />
    );
};

export default ResetChannelPosts;
