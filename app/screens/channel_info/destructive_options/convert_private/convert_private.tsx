// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl, type IntlShape} from 'react-intl';
import {Alert} from 'react-native';

import {convertChannelToPrivate} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {alertErrorWithFallback} from '@utils/draft';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    canConvert: boolean;
    channelId: string;
    displayName: string;
}

const messages = defineMessages({
    convertPrivateTitle: {
        id: 'channel_info.convert_private_title',
        defaultMessage: 'Convert {displayName} to a private channel?',
    },
    convertPrivateDescription: {
        id: 'channel_info.convert_private_description',
        defaultMessage: 'When you convert {displayName} to a private channel, history and membership are preserved. Publicly shared files remain accessible to anyone with the link. Membership in a private channel is by invitation only.\n\nThe change is permanent and cannot be undone.\n\nAre you sure you want to convert {displayName} to a private channel?',
    },
    alertNo: {
        id: 'channel_info.alertNo',
        defaultMessage: 'No',
    },
    alertYes: {
        id: 'channel_info.alertYes',
        defaultMessage: 'Yes',
    },
    convertFailed: {
        id: 'channel_info.convert_failed',
        defaultMessage: 'We were unable to convert {displayName} to a private channel.',
    },
    convertPrivateSuccess: {
        id: 'channel_info.convert_private_success',
        defaultMessage: '{displayName} is now a private channel.',
    },
    errorClose: {
        id: 'channel_info.error_close',
        defaultMessage: 'Close',
    },
    alertRetry: {
        id: 'channel_info.alert_retry',
        defaultMessage: 'Try Again',
    },
});

const convertToPrivate = preventDoubleTap(async (serverUrl: string, channelId: string, displayName: string, intl: IntlShape) => {
    const result = await convertChannelToPrivate(serverUrl, channelId);
    const {formatMessage} = intl;
    if (result.error) {
        alertErrorWithFallback(
            intl,
            result.error,
            messages.convertFailed,
            {displayName},
            [{
                text: formatMessage(messages.errorClose),
            }, {
                text: formatMessage(messages.alertRetry),
                onPress: () => convertToPrivate(serverUrl, channelId, displayName, intl),
            }],
        );
    } else {
        Alert.alert(
            '',
            formatMessage(messages.convertPrivateSuccess, {displayName}),
        );
    }
});

const ConvertPrivate = ({canConvert, channelId, displayName}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onConfirmConvertToPrivate = useCallback(() => {
        const {formatMessage} = intl;
        const title = messages.convertPrivateTitle;
        const message = messages.convertPrivateDescription;

        Alert.alert(
            formatMessage(title, {displayName}),
            formatMessage(message, {displayName}),
            [{
                text: formatMessage(messages.alertNo),
            }, {
                text: formatMessage(messages.alertYes),
                onPress: () => convertToPrivate(serverUrl, channelId, displayName, intl),
            }],
        );
    }, [channelId, displayName, intl, serverUrl]);

    if (!canConvert) {
        return null;
    }

    return (
        <OptionItem
            action={onConfirmConvertToPrivate}
            label={intl.formatMessage({id: 'channel_info.convert_private', defaultMessage: 'Convert to private channel'})}
            icon='lock-outline'
            type='default'
            testID='channel_info.options.convert_private.option'
        />
    );
};

export default ConvertPrivate;
