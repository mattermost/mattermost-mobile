// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {leaveChannel} from '@actions/remote/channel';
import {setDirectChannelVisible} from '@actions/remote/preference';
import OptionItem from '@components/option_item';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {dismissAllModalsAndPopToRoot, dismissBottomSheet} from '@screens/navigation';

type Props = {
    isOptionItem?: boolean;
    canLeave: boolean;
    channelId: string;
    displayName?: string;
    type?: string;
    testID?: string;
}

const messages = defineMessages({
    closeDirectMessage: {
        id: 'channel_info.close_dm',
        defaultMessage: 'Close direct message',
    },
    closeGroupMessage: {
        id: 'channel_info.close_gm',
        defaultMessage: 'Close group message',
    },
    closeDirectMessageChannel: {
        id: 'channel_info.close_dm_channel',
        defaultMessage: 'Are you sure you want to close this direct message? This will remove it from your home screen, but you can always open it again.',
    },
    closeGroupMessageChannel: {
        id: 'channel_info.close_gm_channel',
        defaultMessage: 'Are you sure you want to close this group message? This will remove it from your home screen, but you can always open it again.',
    },
    leaveChannel: {
        id: 'channel_info.leave_channel',
        defaultMessage: 'Leave channel',
    },
    leavePrivateChannel: {
        id: 'channel_info.leave_private_channel',
        defaultMessage: "Are you sure you want to leave the private channel {displayName}? You cannot rejoin the channel unless you're invited again.",
    },
    leavePublicChannel: {
        id: 'channel_info.leave_public_channel',
        defaultMessage: 'Are you sure you want to leave the public channel {displayName}? You can always rejoin.',
    },
    cancel: {
        id: 'mobile.post.cancel',
        defaultMessage: 'Cancel',
    },
    close: {
        id: 'channel_info.close',
        defaultMessage: 'Close',
    },
    leave: {
        id: 'channel_info.leave',
        defaultMessage: 'Leave',
    },
});

const LeaveChannelLabel = ({canLeave, channelId, displayName, isOptionItem, type, testID}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();

    const close = async () => {
        await dismissBottomSheet();
        if (!isTablet) {
            await dismissAllModalsAndPopToRoot();
        }
    };

    const closeDirectMessage = () => {
        Alert.alert(
            intl.formatMessage(messages.closeDirectMessage),
            intl.formatMessage(messages.closeDirectMessageChannel),
            [{
                text: intl.formatMessage(messages.cancel),
                style: 'cancel',
            }, {
                text: intl.formatMessage(messages.close),
                style: 'destructive',
                onPress: () => {
                    setDirectChannelVisible(serverUrl, channelId, false);
                    close();
                },
            }], {cancelable: false},
        );
    };

    const closeGroupMessage = () => {
        Alert.alert(
            intl.formatMessage(messages.closeGroupMessage),
            intl.formatMessage(messages.closeGroupMessageChannel),
            [{
                text: intl.formatMessage(messages.cancel),
                style: 'cancel',
            }, {
                text: intl.formatMessage(messages.close),
                style: 'destructive',
                onPress: () => {
                    setDirectChannelVisible(serverUrl, channelId, false);
                    close();
                },
            }], {cancelable: false},
        );
    };

    const leavePublicChannel = () => {
        Alert.alert(
            intl.formatMessage(messages.leaveChannel),
            intl.formatMessage(messages.leavePublicChannel, {displayName}),
            [{
                text: intl.formatMessage(messages.cancel),
                style: 'cancel',
            }, {
                text: intl.formatMessage(messages.leave),
                style: 'destructive',
                onPress: () => {
                    leaveChannel(serverUrl, channelId);
                    close();
                },
            }], {cancelable: false},
        );
    };

    const leavePrivateChannel = () => {
        Alert.alert(
            intl.formatMessage(messages.leaveChannel),
            intl.formatMessage(messages.leavePrivateChannel, {displayName}),
            [{
                text: intl.formatMessage(messages.cancel),
                style: 'cancel',
            }, {
                text: intl.formatMessage(messages.leave),
                style: 'destructive',
                onPress: () => {
                    leaveChannel(serverUrl, channelId);
                    close();
                },
            }], {cancelable: false},
        );
    };

    const onLeave = () => {
        switch (type) {
            case General.OPEN_CHANNEL:
                leavePublicChannel();
                break;
            case General.PRIVATE_CHANNEL:
                leavePrivateChannel();
                break;
            case General.DM_CHANNEL:
                closeDirectMessage();
                break;
            case General.GM_CHANNEL:
                closeGroupMessage();
                break;
        }
    };

    if (!displayName || !type || !canLeave) {
        return null;
    }

    let leaveText;
    let icon;
    switch (type) {
        case General.DM_CHANNEL:
            leaveText = intl.formatMessage(messages.closeDirectMessage);
            icon = 'close';
            break;
        case General.GM_CHANNEL:
            leaveText = intl.formatMessage(messages.closeGroupMessage);
            icon = 'close';
            break;
        default:
            leaveText = intl.formatMessage(messages.leaveChannel);
            icon = 'exit-to-app';
            break;
    }

    if (isOptionItem) {
        return (
            <OptionItem
                action={onLeave}
                destructive={true}
                icon={icon}

                label={leaveText}
                testID={testID}
                type='default'
            />
        );
    }

    return (
        <SlideUpPanelItem
            destructive={true}
            leftIcon={icon}
            onPress={onLeave}
            text={leaveText}
            testID={testID}
        />
    );
};

export default LeaveChannelLabel;
