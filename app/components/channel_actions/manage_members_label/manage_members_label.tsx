// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert, DeviceEventEmitter} from 'react-native';

import {fetchChannelStats, removeMemberFromChannel} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {Events, Members} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

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
    canRemoveUser: boolean;
    channelId: string;
    isOptionItem?: boolean;
    manageOption?: string;
    testID?: string;
    userId: string;
}

const ManageMembersLabel = ({canRemoveUser, channelId, isOptionItem, manageOption, testID, userId}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const handleRemoveUser = useCallback(async () => {
        await removeMemberFromChannel(serverUrl, channelId, userId);
        fetchChannelStats(serverUrl, channelId, false);
        await dismissBottomSheet();
        DeviceEventEmitter.emit(Events.REMOVE_USER_FROM_CHANNEL, userId);
    }, [channelId, userId, serverUrl]);

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
                onPress: handleRemoveUser,
            }], {cancelable: false},
        );
    };

    const onAction = () => {
        // In the future this switch / case will accomodate more user cases
        switch (manageOption) {
            case Members.MANAGE_MEMBERS_OPTIONS.REMOVE_USER:
                removeFromChannel();
                break;
        }
    };

    if (manageOption === Members.MANAGE_MEMBERS_OPTIONS.REMOVE_USER && !canRemoveUser) {
        return null;
    }

    let actionText;
    let icon;
    switch (manageOption) {
        case Members.MANAGE_MEMBERS_OPTIONS.REMOVE_USER:
            actionText = intl.formatMessage(messages.remove_title);
            icon = 'trash-can-outline';
            break;
        default:
            actionText = intl.formatMessage(messages.remove_title);
            icon = 'trash-can-outline';
            break;
    }

    if (isOptionItem) {
        return (
            <OptionItem
                action={onAction}
                destructive={true}
                icon={icon}
                label={actionText}
                testID={testID}
                type='default'
            />
        );
    }

    return (
        <SlideUpPanelItem
            destructive={true}
            icon={icon}
            onPress={onAction}
            text={actionText}
            testID={testID}
        />
    );
};

export default ManageMembersLabel;
