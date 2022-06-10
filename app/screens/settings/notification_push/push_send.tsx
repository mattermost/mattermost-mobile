// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Block from '@components/block';
import FormattedText from '@components/formatted_text';
import OptionItem from '@components/option_item';
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
        container: {
            paddingHorizontal: 8,
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
                    <OptionItem
                        action={setMobilePushPref}
                        containerStyle={styles.container}
                        label={intl.formatMessage({id: 'notification_settings.pushNotification.allActivity', defaultMessage: 'For all activity'})}
                        selected={pushStatus === 'all'}
                        testID='notification_settings.pushNotification.allActivity'
                        type='select'
                        value='all'
                    />
                    <View style={styles.separator}/>
                    <OptionItem
                        action={setMobilePushPref}
                        containerStyle={styles.container}
                        label={intl.formatMessage({id: 'notification_settings.pushNotification.onlyMentions', defaultMessage: 'Only for mentions and direct messages'})}
                        selected={pushStatus === 'mention'}
                        testID='notification_settings.pushNotification.onlyMentions'
                        type='select'
                        value='mention'
                    />
                    <View style={styles.separator}/>
                    <OptionItem
                        action={setMobilePushPref}
                        containerStyle={styles.container}
                        label={intl.formatMessage({id: 'notification_settings.pushNotification.never', defaultMessage: 'Never'})}
                        selected={pushStatus === 'none'}
                        testID='notification_settings.pushNotification.never'
                        type='select'
                        value='none'
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
