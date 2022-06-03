// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {ScrollView} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
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

type NotificationMobileProps = {
    isCRTEnabled: boolean;
    sendPushNotifications: boolean;
};
const NotificationPush = ({isCRTEnabled, sendPushNotifications}: NotificationMobileProps) => {
    const theme = useTheme();
    const [pushStatus, setPushStatus] = useState<PushStatus>('online');
    const [pushPref, setPushPref] = useState<PushStatus>('online');
    const [pushThread, setPushThreadPref] = useState<PushStatus>('online');

    const styles = getStyleSheet(theme);

    const setMobilePushStatus = (status: PushStatus) => {
        setPushStatus(status);
    };

    const setMobilePushPref = (status: PushStatus) => {
        setPushPref(status);
    };

    const onMobilePushThreadChanged = (status: PushStatus) => {
        setPushThreadPref(status);
    };

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
                    sendPushNotifications={sendPushNotifications}
                    pushStatus={pushPref}
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
