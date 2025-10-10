// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';
import Permissions from 'react-native-permissions';

import SectionNotice from '@components/section_notice';
import {Screens} from '@constants';

const styles = StyleSheet.create({
    wrapper: {
        marginVertical: 16,
    },
});

type NotificationsDisabledNoticeProps = {
    testID?: string;
}

const NotificationsDisabledNotice = (props: NotificationsDisabledNoticeProps) => {
    const intl = useIntl();

    const onEnableNotificationClick = useCallback(() => {
        Permissions.openSettings('notifications');
    }, []);

    const primaryButton = useMemo(() => {
        const text = intl.formatMessage({
            id: 'user_settings.notifications.notifications_disabled_notice.button',
            defaultMessage: 'Enable notifications',
        });
        return {
            onClick: onEnableNotificationClick,
            text,
            testID: 'enable-notifications-button',
        };
    }, [intl, onEnableNotificationClick]);

    return (
        <View
            testID={props.testID}
            style={styles.wrapper}
        >
            <SectionNotice
                text={intl.formatMessage({
                    id: 'user_settings.notifications.notifications_disabled_notice.body',
                    defaultMessage: 'You will still see mention badges within the app, but you will not receive push notifications on your device.',
                })}
                title={intl.formatMessage({id: 'user_settings.notifications.notifications_disabled_notice.title', defaultMessage: 'Notifications are disabled'})}
                primaryButton={primaryButton}
                type='danger'
                location={Screens.SETTINGS_NOTIFICATION_PUSH}
            />
        </View>
    );
};

export default NotificationsDisabledNotice;
