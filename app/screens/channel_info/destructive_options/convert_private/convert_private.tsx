// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {convertChannelToPrivate} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {alertErrorWithFallback} from '@utils/draft';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    canConvert: boolean;
    channelId: string;
    displayName: string;
}

const ConvertPrivate = ({canConvert, channelId, displayName}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onConfirmConvertToPrivate = () => {
        const {formatMessage} = intl;
        const title = {id: t('channel_info.convert_private_title'), defaultMessage: 'Convert {displayName} to a private channel?'};
        const message = {
            id: t('channel_info.convert_private_description'),
            defaultMessage: 'When you convert {displayName} to a private channel, history and membership are preserved. Publicly shared files remain accessible to anyone with the link. Membership in a private channel is by invitation only.\n\nThe change is permanent and cannot be undone.\n\nAre you sure you want to convert {displayName} to a private channel?',
        };

        Alert.alert(
            formatMessage(title, {displayName}),
            formatMessage(message, {displayName}),
            [{
                text: formatMessage({id: 'channel_info.alertNo', defaultMessage: 'No'}),
            }, {
                text: formatMessage({id: 'channel_info.alertYes', defaultMessage: 'Yes'}),
                onPress: convertToPrivate,
            }],
        );
    };

    const convertToPrivate = preventDoubleTap(async () => {
        const result = await convertChannelToPrivate(serverUrl, channelId);
        const {formatMessage} = intl;
        if (result.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                {
                    id: t('channel_info.convert_failed'),
                    defaultMessage: 'We were unable to convert {displayName} to a private channel.',
                }, {displayName},
                [{
                    text: formatMessage({id: 'channel_info.error_close', defaultMessage: 'Close'}),
                }, {
                    text: formatMessage({id: 'channel_info.alert_retry', defaultMessage: 'Try Again'}),
                    onPress: convertToPrivate,
                }],
            );
        } else {
            Alert.alert(
                '',
                formatMessage({id: t('channel_info.convert_private_success'), defaultMessage: '{displayName} is now a private channel.'}, {displayName}),
            );
        }
    });

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
