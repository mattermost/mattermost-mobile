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
        flex: 1,
        justifyContent: 'flex-end',
        marginVertical: 16,
    },
});

const NotificationsDisabledNotice = () => {
    const intl = useIntl();

    const onEnableNotificationClick = useCallback(async () => {
        Permissions.openSettings('notifications');
    }, []);

    const primaryButton = useMemo(() => {
        const text = intl.formatMessage({
            id: 'user_settings.notifications.disabled.button',
            defaultMessage: 'Enable notifications',
        });
        return {
            onClick: onEnableNotificationClick,
            text,
        };
    }, [intl, onEnableNotificationClick]);

    return (
        <View style={styles.wrapper}>
            <SectionNotice
                text={intl.formatMessage({
                    id: 'user_settings.notifications.disabled.body',
                    defaultMessage: 'You will still see mention badges within the app, but you will not receive push notifications on your device.',
                })}
                title={intl.formatMessage({id: 'user_settings.notifications.disabled.title', defaultMessage: 'Notifications are disabled'})}
                primaryButton={primaryButton}
                type='danger'
                location={Screens.SETTINGS_NOTIFICATION_PUSH}
            />
        </View>
    );
};

export default NotificationsDisabledNotice;
