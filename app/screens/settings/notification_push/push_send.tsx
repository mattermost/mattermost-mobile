// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
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
    return (
        <Block
            headerText={headerText}
            headerStyles={styles.upperCase}
        >
            {sendPushNotifications &&
                <>
                    <BlockItem
                        testID='notification_settings.pushNotification.allActivity'
                        label={(
                            <FormattedText
                                id='notification_settings.pushNotification.allActivity'
                                defaultMessage='For all activity'
                                style={styles.label}
                            />
                        )}
                        action={setMobilePushPref}
                        actionType='select'
                        actionValue='all'
                        selected={pushStatus === 'all'}
                    />
                    <View style={styles.separator}/>
                    <BlockItem
                        testID='notification_settings.pushNotification.onlyMentions'
                        label={(
                            <FormattedText
                                id='notification_settings.pushNotification.onlyMentions'
                                defaultMessage='Only for mentions and direct messages'
                                style={styles.label}
                            />
                        )}
                        action={setMobilePushPref}
                        actionType='select'
                        actionValue='mention'
                        selected={pushStatus === 'mention'}
                    />
                    <View style={styles.separator}/>
                    <BlockItem
                        testID='notification_settings.pushNotification.never'
                        label={(
                            <FormattedText
                                id='notification_settings.pushNotification.never'
                                defaultMessage='Never'
                                style={styles.label}
                            />
                        )}
                        action={setMobilePushPref}
                        actionType='select'
                        actionValue='none'
                        selected={pushStatus === 'none'}
                    />
                </>
            }
            {!sendPushNotifications &&
                <FormattedText
                    id='notification_settings.pushNotification.disabled_long'
                    defaultMessage='Push notifications for mobile devices have been disabled by your System Administrator.'
                    style={styles.disabled}
                />
            }
        </Block>
    );
};

export default MobileSendPush;
