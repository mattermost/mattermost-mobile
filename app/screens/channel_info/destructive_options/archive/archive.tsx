// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, type MessageDescriptor, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {archiveChannel, unarchiveChannel} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {dismissModal, popToRoot} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    canArchive: boolean;
    canUnarchive: boolean;
    canViewArchivedChannels: boolean;
    channelId: string;
    componentId: AvailableScreens;
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
    alertNo: {
        id: 'channel_info.alertNo',
        defaultMessage: 'No',
    },
    alertYes: {
        id: 'channel_info.alertYes',
        defaultMessage: 'Yes',
    },
    archiveTitle: {
        id: 'channel_info.archive_title',
        defaultMessage: 'Archive {term}',
    },
    archiveDescriptionCanViewArchived: {
        id: 'channel_info.archive_description.can_view_archived',
        defaultMessage: 'This will archive the channel from the team. Channel contents will still be accessible by channel members.\n\nAre you sure you wish to archive the {term} {name}?',
    },
    archiveDescriptionCannotViewArchived: {
        id: 'channel_info.archive_description.cannot_view_archived',
        defaultMessage: 'This will archive the channel from the team and remove it from the user interface. Archived channels can be unarchived if needed again.\n\nAre you sure you wish to archive the {term} {name}?',
    },
    archiveFailed: {
        id: 'channel_info.archive_failed',
        defaultMessage: 'An error occurred trying to archive the channel {displayName}',
    },
    unarchiveTitle: {
        id: 'channel_info.unarchive_title',
        defaultMessage: 'Unarchive {term}',
    },
    unarchiveDescription: {
        id: 'channel_info.unarchive_description',
        defaultMessage: 'Are you sure you want to unarchive the {term} {name}?',
    },
    unarchiveFailed: {
        id: 'channel_info.unarchive_failed',
        defaultMessage: 'An error occurred trying to unarchive the channel {displayName}',
    },
});

const Archive = ({
    canArchive, canUnarchive, canViewArchivedChannels,
    channelId, componentId, displayName, type,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const close = useCallback(async (pop: boolean) => {
        await dismissModal({componentId});
        if (pop) {
            popToRoot();
        }
    }, [componentId]);

    const alertAndHandleYesAction = useCallback((title: MessageDescriptor, message: MessageDescriptor, onPressAction: () => void) => {
        const {formatMessage} = intl;
        let term: string;
        if (type === General.OPEN_CHANNEL) {
            term = formatMessage(messages.publicChannel);
        } else {
            term = formatMessage(messages.privateChannel);
        }

        Alert.alert(
            formatMessage(title, {term}),
            formatMessage(message, {term: term.toLowerCase(), name: displayName}),
            [{
                text: formatMessage(messages.alertNo),
            }, {
                text: formatMessage(messages.alertYes),
                onPress: onPressAction,
            }],
        );
    }, [displayName, intl, type]);

    const onArchive = usePreventDoubleTap(useCallback(() => {
        const title = messages.archiveTitle;
        const message = canViewArchivedChannels ? messages.archiveDescriptionCanViewArchived : messages.archiveDescriptionCannotViewArchived;

        const onPressAction = async () => {
            const result = await archiveChannel(serverUrl, channelId);
            if (result.error) {
                alertErrorWithFallback(
                    intl,
                    result.error,
                    messages.archiveFailed,
                    {displayName},
                );
            } else {
                close(!canViewArchivedChannels);
            }
        };
        alertAndHandleYesAction(title, message, onPressAction);
    }, [alertAndHandleYesAction, canViewArchivedChannels, channelId, close, displayName, intl, serverUrl]));

    const onUnarchive = usePreventDoubleTap(useCallback(() => {
        const title = messages.unarchiveTitle;
        const message = messages.unarchiveDescription;
        const onPressAction = async () => {
            const result = await unarchiveChannel(serverUrl, channelId);
            if (result.error) {
                alertErrorWithFallback(
                    intl,
                    result.error,
                    messages.unarchiveFailed,
                    {displayName},
                );
            } else {
                close(false);
            }
        };
        alertAndHandleYesAction(title, message, onPressAction);
    }, [alertAndHandleYesAction, channelId, close, displayName, intl, serverUrl]));

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
                testID='channel_info.options.unarchive_channel.option'
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
            testID='channel_info.options.archive_channel.option'
        />
    );
};

export default Archive;
