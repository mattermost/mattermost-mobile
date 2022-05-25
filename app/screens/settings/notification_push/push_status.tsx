// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Block from '@components/block';
import BlockItem from '@components/block_item';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {PushStatus} from '@screens/settings/notification_push/notification_push';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const headerText = {
    id: t('notification_settings.mobile.push_status'),
    defaultMessage: 'Trigger push notifications when',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        upperCase: {
            textTransform: 'uppercase',
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
            marginLeft: 15,
        },
        area: {
            paddingHorizontal: 16,
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),

        },
    };
});

type MobilePushStatusProps = {
    sendPushNotifications: boolean;
    pushStatus: PushStatus;
    setMobilePushStatus: (status: PushStatus) => void;
}
const MobilePushStatus = ({sendPushNotifications, pushStatus, setMobilePushStatus}: MobilePushStatusProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const showSection = sendPushNotifications && pushStatus !== 'none';

    if (!showSection) {
        return null;
    }

    return (
        <Block
            headerText={headerText}
            headerStyles={styles.upperCase}
            containerStyles={styles.area}
        >
            <BlockItem
                label={(
                    <FormattedText
                        id='notification_settings.mobile.online'
                        defaultMessage='Online, away or offline'
                        style={styles.label}
                    />
                )}
                action={setMobilePushStatus}
                actionType='select'
                actionValue='online'
                selected={pushStatus === 'online'}
            />
            <View style={styles.separator}/>
            <BlockItem
                label={(
                    <FormattedText
                        id='notification_settings.mobile.away'
                        defaultMessage='Away or offline'
                        style={styles.label}
                    />
                )}
                action={setMobilePushStatus}
                actionType='select'
                actionValue='away'
                selected={pushStatus === 'away'}
            />
            <View style={styles.separator}/>
            <BlockItem
                label={(
                    <FormattedText
                        id='notification_settings.mobile.offline'
                        defaultMessage='Offline'
                        style={styles.label}
                    />
                )}
                action={setMobilePushStatus}
                actionType='select'
                actionValue='offline'
                selected={pushStatus === 'offline'}
            />
        </Block>
    );
};

export default MobilePushStatus;
