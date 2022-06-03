// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Block from '@components/block';
import BlockItem from '@components/block_item';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const headerText = {
    id: t('notification_settings.send_notification'),
    defaultMessage: 'Send notifications',
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
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
        disabled: {
            color: theme.centerChannelColor,
            fontSize: 15,
            paddingHorizontal: 15,
            paddingVertical: 10,
        },
    };
});

type MobileSendPushProps = {
    sendPushNotifications: boolean;
    pushStatus: PushStatus;
    setMobilePushPref: (status: PushStatus) => void;
}
const MobileSendPush = ({sendPushNotifications, pushStatus, setMobilePushPref}: MobileSendPushProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    return (
        <Block
            headerText={headerText}
            headerStyles={styles.upperCase}
        >
            {sendPushNotifications &&
                <>
                    <BlockItem
                        action={setMobilePushPref}
                        actionType='select'
                        actionValue='all'
                        label={intl.formatMessage({id: 'notification_settings.pushNotification.allActivity', defaultMessage: 'For all activity'})}
                        labelStyle={styles.label}
                        selected={pushStatus === 'all'}
                        testID='notification_settings.pushNotification.allActivity'
                    />
                    <View style={styles.separator}/>
                    <BlockItem
                        action={setMobilePushPref}
                        actionType='select'
                        actionValue='mention'
                        label={intl.formatMessage({id: 'notification_settings.pushNotification.onlyMentions', defaultMessage: 'Only for mentions and direct messages'})}
                        labelStyle={styles.label}
                        selected={pushStatus === 'mention'}
                        testID='notification_settings.pushNotification.onlyMentions'
                    />
                    <View style={styles.separator}/>
                    <BlockItem
                        action={setMobilePushPref}
                        actionType='select'
                        actionValue='none'
                        label={intl.formatMessage({id: 'notification_settings.pushNotification.never', defaultMessage: 'Never'})}
                        labelStyle={styles.label}
                        selected={pushStatus === 'none'}
                        testID='notification_settings.pushNotification.never'
                    />
                </>
            }
            {!sendPushNotifications &&
                <FormattedText
                    defaultMessage='Push notifications for mobile devices have been disabled by your System Administrator.'
                    id='notification_settings.pushNotification.disabled_long'
                    style={styles.disabled}
                />
            }
        </Block>
    );
};

export default MobileSendPush;
