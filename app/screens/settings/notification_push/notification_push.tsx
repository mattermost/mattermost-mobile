// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

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
    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser.notifyProps]);

    const [pushSend, setPushSend] = useState<PushStatus>(notifyProps.push as unknown as PushStatus);
    const [pushStatus, setPushStatus] = useState<PushStatus>(notifyProps.push_status as unknown as PushStatus);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const [pushThread, setPushThreadPref] = useState<PushStatus>(notifyProps.push_threads); //fixme: fix ts issue

    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const setMobilePushStatus = useCallback((status: PushStatus) => {
        setPushStatus(status);
    }, [pushStatus]);

    const setMobilePushPref = useCallback((status: PushStatus) => {
        setPushSend(status);
    }, [pushSend]);

    const onMobilePushThreadChanged = useCallback(() => {
        setPushThreadPref(pushThread === 'all' ? 'mention' : 'all');
    }, [pushThread]);

    const canSave = useCallback(() => {
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
    }, [componentId, pushSend, pushThread, pushStatus, notifyProps]);

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
        //todo: implement me
    }, []);

    useNavButtonPressed(SAVE_NOTIF_BUTTON_ID, componentId, saveNotificationSettings, []); //todo: add dependencies here

    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        setButtons(componentId, {
            rightButtons: [saveButton],
        });
    }, []);

    useEffect(() => {
        canSave();
    }, [pushSend, pushThread, pushStatus]);

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
                    setMobilePushPref={setMobilePushPref}
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
                        setMobilePushStatus={setMobilePushStatus}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationPush;
