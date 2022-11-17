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
import {t} from '@i18n';
import {dismissAllModals, dismissBottomSheet, popToRoot} from '@screens/navigation';

const messages = defineMessages({
    remove_title: {id: t('mobile.manage_members.remove_member'), defaultMessage: 'Remove Member'},
    remove_message: {
        id: t('mobile.manage_members.message.'),
        defaultMessage: 'Are you sure you want to remove the selected member from the channel?',
    },
    remove_cancel: {id: t('mobile.manage_members.cancel'), defaultMessage: 'Cancel'},
    remove_confirm: {id: t('mobile.manage_members.remove'), defaultMessage: 'Remove'},
});

type Props = {
    isOptionItem?: boolean;
    canLeave: boolean;
    channelId: string;
    displayName?: string;
    manageOption?: string;
    type?: string;
    testID?: string;
}

const LeaveChanelLabel = ({canLeave, channelId, displayName, isOptionItem, manageOption, type, testID}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();

    const close = async () => {
        await dismissBottomSheet();
        if (!isTablet) {
            await dismissAllModals();
            popToRoot();
        }
    };

    const removeFromChannel = () => {
        Alert.alert(
            intl.formatMessage(messages.remove_title),
            intl.formatMessage(messages.remove_message),
            [{
                text: intl.formatMessage(messages.remove_cancel),
                style: 'cancel',
            }, {
                text: intl.formatMessage(messages.remove_confirm),
                style: 'destructive',
                onPress: async () => {
                // setDirectChannelVisible(serverUrl, channelId, false);
                    await dismissBottomSheet();
                },
            }], {cancelable: false},
        );
    };

    const closeDirectMessage = () => {
        Alert.alert(
            intl.formatMessage({id: 'channel_info.close_dm', defaultMessage: 'Close direct message'}),
            intl.formatMessage({
                id: 'channel_info.close_dm_channel',
                defaultMessage: 'Are you sure you want to close this direct message? This will remove it from your home screen, but you can always open it again.',
            }),
            [{
                text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            }, {
                text: intl.formatMessage({id: 'channel_info.close', defaultMessage: 'Close'}),
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
            intl.formatMessage({id: 'channel_info.close_gm', defaultMessage: 'Close group message'}),
            intl.formatMessage({
                id: 'channel_info.close_gm_channel',
                defaultMessage: 'Are you sure you want to close this group message? This will remove it from your home screen, but you can always open it again.',
            }),
            [{
                text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            }, {
                text: intl.formatMessage({id: 'channel_info.close', defaultMessage: 'Close'}),
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
            intl.formatMessage({id: 'channel_info.leave_channel', defaultMessage: 'Leave Channel'}),
            intl.formatMessage({
                id: 'channel_info.leave_public_channel',
                defaultMessage: 'Are you sure you want to leave the public channel {displayName}? You can always rejoin.',
            }, {displayName}),
            [{
                text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            }, {
                text: intl.formatMessage({id: 'channel_info.leave', defaultMessage: 'Leave'}),
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
            intl.formatMessage({id: 'channel_info.leave_channel', defaultMessage: 'Leave Channel'}),
            intl.formatMessage({
                id: 'channel_info.leave_private_channel',
                defaultMessage: "Are you sure you want to leave the private channel {displayName}? You cannot rejoin the channel unless you're invited again.",
            }, {displayName}),
            [{
                text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            }, {
                text: intl.formatMessage({id: 'channel_info.leave', defaultMessage: 'Leave'}),
                style: 'destructive',
                onPress: () => {
                    leaveChannel(serverUrl, channelId);
                    close();
                },
            }], {cancelable: false},
        );
    };

    const onLeave = () => {
        if (manageOption) {
            switch (manageOption) {
                case 'remove':
                    removeFromChannel();
                    break;
            }
            return;
        }

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
    if (manageOption) {
        switch (manageOption) {
            case 'remove':
                leaveText = intl.formatMessage({id: 'mobile.manage_members.remove_member', defaultMessage: 'Remove member'});
                icon = 'trash-can-outline';
                break;
            default:
                leaveText = intl.formatMessage({id: 'channel_info.leave_channel', defaultMessage: 'Leave channel'});
                icon = 'exit-to-app';
                break;
        }
    } else {
        switch (type) {
            case General.DM_CHANNEL:
                leaveText = intl.formatMessage({id: 'channel_info.close_dm', defaultMessage: 'Close direct message'});
                icon = 'close';
                break;
            case General.GM_CHANNEL:
                leaveText = intl.formatMessage({id: 'channel_info.close_gm', defaultMessage: 'Close group message'});
                icon = 'close';
                break;
            default:
                leaveText = intl.formatMessage({id: 'channel_info.leave_channel', defaultMessage: 'Leave channel'});
                icon = 'exit-to-app';
                break;
        }
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
            icon={icon}
            onPress={onLeave}
            text={leaveText}
            testID={testID}
        />
    );
};

export default LeaveChanelLabel;
