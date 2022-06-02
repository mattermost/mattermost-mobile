// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {MessageDescriptor, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {archiveChannel, unarchiveChannel} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissModal, popToRoot} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    canArchive: boolean;
    canUnarchive: boolean;
    canViewArchivedChannels: boolean;
    channelId: string;
    componentId: string;
    displayName: string;
    type?: ChannelType;
}

const Archive = ({
    canArchive, canUnarchive, canViewArchivedChannels,
    channelId, componentId, displayName, type,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const close = async (pop: boolean) => {
        await dismissModal({componentId});
        if (pop) {
            popToRoot();
        }
    };

    const alertAndHandleYesAction = (title: MessageDescriptor, message: MessageDescriptor, onPressAction: () => void) => {
        const {formatMessage} = intl;
        let term: string;
        if (type === General.OPEN_CHANNEL) {
            term = formatMessage({id: 'channel_info.public_channel', defaultMessage: 'Public Channel'});
        } else {
            term = formatMessage({id: 'channel_info.private_channel', defaultMessage: 'Private Channel'});
        }

        Alert.alert(
            formatMessage(title, {term}),
            formatMessage(message, {term: term.toLowerCase(), name: displayName}),
            [{
                text: formatMessage({id: 'channel_info.alertNo', defaultMessage: 'No'}),
            }, {
                text: formatMessage({id: 'channel_info.alertYes', defaultMessage: 'Yes'}),
                onPress: onPressAction,
            }],
        );
    };

    const onArchive = preventDoubleTap(() => {
        const title = {id: t('channel_info.archive_title'), defaultMessage: 'Archive {term}'};
        const message = {
            id: t('channel_info.archive_description'),
            defaultMessage: 'Are you sure you want to archive the {term} {name}?',
        };
        const onPressAction = async () => {
            const result = await archiveChannel(serverUrl, channelId);
            if (result.error) {
                alertErrorWithFallback(
                    intl,
                    result.error,
                    {
                        id: t('channel_info.archive_failed'),
                        defaultMessage: 'An error occurred trying to archive the channel {displayName}',
                    }, {displayName},
                );
            } else {
                close(!canViewArchivedChannels);
            }
        };
        alertAndHandleYesAction(title, message, onPressAction);
    });

    const onUnarchive = preventDoubleTap(() => {
        const title = {id: t('channel_info.unarchive_title'), defaultMessage: 'Unarchive {term}'};
        const message = {
            id: t('channel_info.unarchive_description'),
            defaultMessage: 'Are you sure you want to unarchive the {term} {name}?',
        };
        const onPressAction = async () => {
            const result = await unarchiveChannel(serverUrl, channelId);
            if (result.error) {
                alertErrorWithFallback(
                    intl,
                    result.error,
                    {
                        id: t('channel_info.unarchive_failed'),
                        defaultMessage: 'An error occurred trying to unarchive the channel {displayName}',
                    }, {displayName},
                );
            } else {
                close(false);
            }
        };
        alertAndHandleYesAction(title, message, onPressAction);
    });

    if (!canArchive && !canUnarchive) {
        return null;
    }

    if (canUnarchive) {
        return (
            <OptionItem
                action={onUnarchive}
                label={intl.formatMessage({id: 'channel_info.unarchive', defaultMessage: 'Unarchive Channel'})}
                icon='archive-arrow-up-outline'
                destructive={true}
                type='default'
            />
        );
    }

    return (
        <OptionItem
            action={onArchive}
            label={intl.formatMessage({id: 'channel_info.archive', defaultMessage: 'Archive Channel'})}
            icon='archive-outline'
            destructive={true}
            type='default'
        />
    );
};

export default Archive;
