// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateMe} from '@actions/remote/user';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {popTopScreen, setButtons} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getNotificationProps} from '@utils/user';

import MobileSendPush from './push_send';
import MobilePushStatus from './push_status';
import MobilePushThread from './push_thread';

import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        },
        scrollViewContent: {
            paddingVertical: 30,
        },
    };
});

const edges: Edge[] = ['left', 'right'];

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
    const styles = getStyleSheet(theme);

    const onMobilePushThreadChanged = useCallback(() => {
        setPushThreadPref(pushThread === 'all' ? 'mention' : 'all');
    }, [pushThread]);

    const saveButton = useMemo(() => {
        return {
            id: SAVE_NOTIF_BUTTON_ID,
            enabled: false,
            showAsAction: 'always' as const,
            testID: 'notification_settings.save.button',
            color: theme.sidebarHeaderTextColor,
            text: intl.formatMessage({id: 'settings.save', defaultMessage: 'Save'}),
        };
    }, [theme.sidebarHeaderTextColor]);

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
        <SafeAreaView
            edges={edges}
            testID='notification_push.screen'
            style={styles.container}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                alwaysBounceVertical={false}
            >
                <MobileSendPush
                    pushStatus={pushSend}
                    sendPushNotifications={sendPushNotifications}
                    setMobilePushPref={setPushSend}
                />
                {isCRTEnabled && pushSend === 'mention' && (
                    <MobilePushThread
                        pushThread={pushThread}
                        onMobilePushThreadChanged={onMobilePushThreadChanged}
                    />
                )}
                {sendPushNotifications && pushSend !== 'none' && (
                    <MobilePushStatus
                        pushStatus={pushStatus}
                        setMobilePushStatus={setPushStatus}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationPush;
