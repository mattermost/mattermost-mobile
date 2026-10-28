// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {permanentlyDeleteChannel} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateBack, navigateToRoot} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';

type Props = {
    canDelete: boolean;
    channelId: string;
    displayName: string;
    type?: ChannelType;
}

const messages = defineMessages({
    publicChannel: {
        id: 'channel_info.public_channel',
        defaultMessage: 'Public Channel',
    },
    privateChannel: {
        id: 'channel_info.private_channel',
        defaultMessage: 'Private Channel',
    },
    cancel: {
        id: 'channel_info.permanent_delete.cancel',
        defaultMessage: 'Cancel',
    },
    confirm: {
        id: 'channel_info.permanent_delete.confirm',
        defaultMessage: 'Delete permanently',
    },
    title: {
        id: 'channel_info.permanent_delete.title',
        defaultMessage: 'Delete {term} permanently?',
    },
    description: {
        id: 'channel_info.permanent_delete.description',
        defaultMessage: 'This permanently deletes {term} {name} for everyone, including all messages and files. This cannot be undone. Continue only if you have a database backup.',
    },
    failed: {
        id: 'channel_info.permanent_delete.failed',
        defaultMessage: 'Unable to permanently delete {displayName}. The server must allow permanent channel deletion and you must have permission.',
    },
});

const PermanentDelete = ({canDelete, channelId, displayName, type}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const close = useCallback(async () => {
        await navigateBack();
        navigateToRoot();
    }, []);

    const onDelete = usePreventDoubleTap(useCallback(() => {
        const term = intl.formatMessage(type === General.OPEN_CHANNEL ? messages.publicChannel : messages.privateChannel);
        Alert.alert(
            intl.formatMessage(messages.title, {term}),
            intl.formatMessage(messages.description, {term: term.toLowerCase(), name: displayName}),
            [{
                text: intl.formatMessage(messages.cancel),
                style: 'cancel',
            }, {
                text: intl.formatMessage(messages.confirm),
                style: 'destructive',
                onPress: async () => {
                    const result = await permanentlyDeleteChannel(serverUrl, channelId);
                    if (result.error) {
                        alertErrorWithFallback(intl, result.error, messages.failed, {displayName});
                    } else {
                        close();
                    }
                },
            }],
        );
    }, [channelId, close, displayName, intl, serverUrl, type]));

    if (!canDelete) {
        return null;
    }

    return (
        <OptionItem
            action={onDelete}
            label={intl.formatMessage({id: 'channel_info.permanent_delete.label', defaultMessage: 'Delete Channel Permanently'})}
            icon='trash-can-outline'
            destructive={true}
            type='default'
            testID='channel_settings.permanent_delete.option'
        />
    );
};

export default PermanentDelete;
