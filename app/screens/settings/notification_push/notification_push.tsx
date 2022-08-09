// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import {updateMe} from '@actions/remote/user';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {popTopScreen, setButtons} from '@screens/navigation';
import SettingSeparator from '@screens/settings/settings_separator';
import {getNotificationProps} from '@utils/user';

import {getSaveButton} from '../config';
import SettingContainer from '../setting_container';

import MobileSendPush from './push_send';
import MobilePushStatus from './push_status';
import MobilePushThread from './push_thread';

import type UserModel from '@typings/database/models/servers/user';

const SAVE_NOTIF_BUTTON_ID = 'SAVE_NOTIF_BUTTON_ID';

type NotificationMobileProps = {
    componentId: string;
    currentUser: UserModel;
    isCRTEnabled: boolean;
    sendPushNotifications: boolean;
};
const NotificationPush = ({componentId, currentUser, isCRTEnabled, sendPushNotifications}: NotificationMobileProps) => {
    const serverUrl = useServerUrl();

    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser.notifyProps]);

    const [pushSend, setPushSend] = useState<PushStatus>(notifyProps.push);
    const [pushStatus, setPushStatus] = useState<PushStatus>(notifyProps.push_status);
    const [pushThread, setPushThreadPref] = useState<PushStatus>(notifyProps?.push_threads || 'all');

    const intl = useIntl();
    const theme = useTheme();

    const onMobilePushThreadChanged = useCallback(() => {
        setPushThreadPref(pushThread === 'all' ? 'mention' : 'all');
    }, [pushThread]);

    const saveButton = useMemo(() => getSaveButton(SAVE_NOTIF_BUTTON_ID, intl, theme.sidebarHeaderTextColor), [theme.sidebarHeaderTextColor]);

    const close = useCallback(() => popTopScreen(componentId), [componentId]);

    const saveNotificationSettings = useCallback(() => {
        const notify_props = {...notifyProps, push: pushSend, push_status: pushStatus, push_threads: pushThread};
        updateMe(serverUrl, {notify_props} as unknown as UserNotifyProps);
        close();
    }, [serverUrl, notifyProps, pushSend, pushStatus, pushThread, close]);

    useEffect(() => {
        const p = pushSend !== notifyProps.push;
        const pT = pushThread !== notifyProps.push_threads;
        const pS = pushStatus !== notifyProps.push_status;

        const enabled = p || pT || pS;

        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled,
            }],
        };
        setButtons(componentId, buttons);
    }, [
        componentId,
        notifyProps,
        pushSend,
        pushStatus,
        pushThread,
    ]);

    useNavButtonPressed(SAVE_NOTIF_BUTTON_ID, componentId, saveNotificationSettings, [saveNotificationSettings]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SettingContainer>
            <MobileSendPush
                pushStatus={pushSend}
                sendPushNotifications={sendPushNotifications}
                setMobilePushPref={setPushSend}
            />
            {Platform.OS === 'android' && (<SettingSeparator isGroupSeparator={true}/>)}
            {isCRTEnabled && pushSend === 'mention' && (
                <MobilePushThread
                    pushThread={pushThread}
                    onMobilePushThreadChanged={onMobilePushThreadChanged}
                />
            )}
            {Platform.OS === 'android' && (<SettingSeparator isGroupSeparator={true}/>)}
            {sendPushNotifications && pushSend !== 'none' && (
                <MobilePushStatus
                    pushStatus={pushStatus}
                    setMobilePushStatus={setPushStatus}
                />
            )}
        </SettingContainer>
    );
};

export default NotificationPush;
