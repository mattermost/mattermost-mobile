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

import MobileSendPush from './push_send';
import MobilePushStatus from './push_status';
import MobilePushThread from './push_thread';

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
    isCRTEnabled: boolean;
    sendPushNotifications: boolean;
};
const NotificationPush = ({componentId, isCRTEnabled, sendPushNotifications}: NotificationMobileProps) => {
    //fixme: assign proper value instead of defaulting to 'online'
    const [pushPref, setPushPref] = useState<PushStatus>('online');
    const [pushStatus, setPushStatus] = useState<PushStatus>('online');
    const [pushThread, setPushThreadPref] = useState<boolean>(false);
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const setMobilePushStatus = useCallback((status: PushStatus) => {
        setPushStatus(status);
    }, [pushStatus]);

    const setMobilePushPref = useCallback((status: PushStatus) => {
        setPushPref(status);
    }, [pushPref]);

    const onMobilePushThreadChanged = useCallback(() => {
        setPushThreadPref((prev) => !prev);
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
        //todo: implement me
    }, []);

    useNavButtonPressed(SAVE_NOTIF_BUTTON_ID, componentId, saveNotificationSettings, []); //todo: add dependencies here

    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        setButtons(componentId, {
            rightButtons: [saveButton],
        });
    }, []);

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
                    pushStatus={pushPref}
                    sendPushNotifications={sendPushNotifications}
                    setMobilePushPref={setMobilePushPref}
                />
                {isCRTEnabled && pushPref === 'mention' && (
                    <MobilePushThread
                        pushThread={pushThread}
                        onMobilePushThreadChanged={onMobilePushThreadChanged}
                    />
                )}
                {sendPushNotifications && pushPref !== 'none' && (
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
