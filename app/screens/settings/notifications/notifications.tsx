// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform, ScrollView, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {goToScreen} from '@screens/navigation';
import SettingOption from '@screens/settings/setting_option';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            ...Platform.select({
                ios: {
                    flex: 1,
                    paddingTop: 35,
                },
            }),
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            width: '100%',
        },
    };
});
const edges: Edge[] = ['left', 'right'];

type NotificationsProps = {
    isCRTEnabled: boolean;
    enableAutoResponder: boolean;
}
const Notifications = ({isCRTEnabled, enableAutoResponder}: NotificationsProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    let mentionsI18nId = t('notification_settings.mentions_replies');
    let mentionsI18nDefault = 'Mentions and Replies';
    if (isCRTEnabled) {
        mentionsI18nId = t('notification_settings.mentions');
        mentionsI18nDefault = 'Mentions';
    }

    const goToNotificationSettingsMentions = () => {
        const screen = Screens.SETTINGS_NOTIFICATION_MENTION;

        const id = isCRTEnabled ? t('notification_settings.mentions') : t('notification_settings.mentions_replies');
        const defaultMessage = isCRTEnabled ? 'Mentions' : 'Mentions and Replies';
        const title = intl.formatMessage({id, defaultMessage});

        goToScreen(screen, title);
    };

    const goToNotificationSettingsPush = () => {
        const screen = Screens.SETTINGS_NOTIFICATION_PUSH;
        const title = intl.formatMessage({
            id: 'notification_settings.push_notification',
            defaultMessage: 'Push Notifications',
        });

        goToScreen(screen, title);
    };

    const goToNotificationAutoResponder = () => {
        const screen = Screens.SETTINGS_NOTIFICATION_AUTO_RESPONDER;
        const title = intl.formatMessage({
            id: 'notification_settings.auto_responder',
            defaultMessage: 'Automatic Replies',
        });
        goToScreen(screen, title);
    };

    return (
        <SafeAreaView
            edges={edges}
            testID='notification_settings.screen'
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.wrapper}
                alwaysBounceVertical={false}
            >
                <View style={styles.divider}/>
                <SettingOption
                    defaultMessage={mentionsI18nDefault}
                    i18nId={mentionsI18nId}
                    onPress={goToNotificationSettingsMentions}
                    optionName='mentions'
                />
                <SettingOption
                    optionName='push_notification'
                    onPress={goToNotificationSettingsPush}
                />
                {enableAutoResponder && (
                    <SettingOption
                        onPress={goToNotificationAutoResponder}
                        optionName='automatic_dm_replies'
                    />
                )}
                <View style={styles.divider}/>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Notifications;
