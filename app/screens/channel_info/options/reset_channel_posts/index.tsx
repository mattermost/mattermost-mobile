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
    deleteFailedTitle: {
        id: 'channel_info.reset_posts.delete_failed.title',
        defaultMessage: "Couldn't reset messages",
    },
    deleteFailedBody: {
        id: 'channel_info.reset_posts.delete_failed.body',
        defaultMessage: 'Something went wrong while clearing the cached messages. Please try again.',
    },
    fetchFailedTitle: {
        id: 'channel_info.reset_posts.fetch_failed.title',
        defaultMessage: "Couldn't download messages",
    },
    fetchFailedBody: {
        id: 'channel_info.reset_posts.fetch_failed.body',
        defaultMessage: 'The cached messages were cleared but they could not be downloaded again. Check that you have an active internet connection and try again.',
    },
});

type Props = {
    channelId: string;
};

const ResetChannelPosts = ({channelId}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const doReset = useCallback(async () => {
        // Clear the channel's local posts + PostsInChannel intervals and reset lastFetchedAt.
        const {error: deleteError} = await deletePostsForChannel(serverUrl, channelId);
        if (deleteError) {
            logError('Failed to delete posts while resetting channel', deleteError);
            Alert.alert(
                intl.formatMessage(messages.deleteFailedTitle),
                intl.formatMessage(messages.deleteFailedBody),
            );
            return;
        }

        // Re-fetch a clean page from the server (excludes deleted posts).
        const {error: fetchError} = await fetchPostsForChannel(serverUrl, channelId);
        if (fetchError) {
            logError('Failed to fetch posts after resetting channel', fetchError);
            Alert.alert(
                intl.formatMessage(messages.fetchFailedTitle),
                intl.formatMessage(messages.fetchFailedBody),
            );
            return;
        }

        // Both succeeded: dismiss Channel Info so the user lands back on the
        // (now-repopulated) channel.
        await navigateBack();
    }, [serverUrl, channelId, intl]);

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
