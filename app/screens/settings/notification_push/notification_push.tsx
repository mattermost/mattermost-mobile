// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import MobilePushStatus from './mobile_push_status';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 12,
            height: 40,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
            marginLeft: 15,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        },
        scrollViewContent: {
            paddingVertical: 30,
        },
        disabled: {
            color: theme.centerChannelColor,
            fontSize: 15,
            paddingHorizontal: 15,
            paddingVertical: 10,
        },

    };
});
export type PushStatus = 'away' | 'online' | 'offline' | 'none' | 'mention';

type NotificationMobileProps = {
    sendPushNotifications: boolean;
    isCRTEnabled?: boolean;
};
const NotificationMobile = ({sendPushNotifications}: NotificationMobileProps) => {
    const theme = useTheme();
    const [pushStatus, setPushStatus] = useState<PushStatus>('online');

    const styles = getStyleSheet(theme);

    const setMobilePushStatus = (status: PushStatus) => {
        setPushStatus(status);
    };

    return (
        <SafeAreaView
            edges={['left', 'right']}
            testID='notification_mobile.screen'
            style={styles.container}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                alwaysBounceVertical={false}
            >
                <MobilePushStatus
                    sendPushNotifications={sendPushNotifications}
                    pushStatus={pushStatus}
                    setMobilePushStatus={setMobilePushStatus}
                />
                {/*{isCRTEnabled && pushStatus === 'mention' && (*/}
                {/*    this.renderMobilePushThreadsSection(styles)*/}
                {/*)}*/}
                {/*{this.renderMobilePushStatusSection(styles)}*/}
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationMobile;
