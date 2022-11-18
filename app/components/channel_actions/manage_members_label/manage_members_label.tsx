// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {removeMembersFromChannel} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {General} from '@constants';
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
    canRemove: boolean;
    channelId: string;
    isOptionItem?: boolean;
    manageOption?: string;
    testID?: string;
    userId: string;
}

const ManageMembersLabel = ({canRemove, channelId, isOptionItem, manageOption, testID, userId}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    // const isTablet = useIsTablet();

    // const close = async () => {
    //     await dismissBottomSheet();
    //     if (!isTablet) {
    //         await dismissAllModals();
    //         popToRoot();
    //     }
    // };

    // removeCurrentUserFromChannel (gekidou)
    // removeChannelMember (master)

    // const handleRemoveFromChannel = useCallback(async () => {
    //     removeFromChannel();
    // }, [userId, serverUrl]);

    // await dismissBottomSheet(Screens.USER_PROFILE);
    // X - 1. click remove
    // X - 2. verify want to remove user
    // 3. remove from remote server
    // 3a. check response
    // 4. if yes, remove from local
    // 5. close panel
    // 6 update the user list (should happen by database observe)
    // const {data} = await removeFromChannel(serverUrl, userId);
    // if (data) {
    //     switchToChannelById(serverUrl, data.id);
    // }
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
                    await removeMembersFromChannel(serverUrl, channelId, [userId]);
                    await dismissBottomSheet();
                },
            }], {cancelable: false},
        );
    };

    const onAction = () => {
        switch (manageOption) {
            case General.MANAGE_MEMBERS_OPTIONS.REMOVE_USER:
                removeFromChannel();
                break;
        }
    };

    if (manageOption === General.MANAGE_MEMBERS_OPTIONS.REMOVE_USER && !canRemove) {
        return null;
    }

    let actionText;
    let icon;
    switch (manageOption) {
        case General.MANAGE_MEMBERS_OPTIONS.REMOVE_USER:
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
