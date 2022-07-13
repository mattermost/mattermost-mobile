// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import {t} from '@i18n';

import SettingBlock from '../setting_block';
import SettingOption from '../setting_option';
import SettingSeparator from '../settings_separator';

const styles = StyleSheet.create({
    area: {
        paddingHorizontal: 16,
    },
});

const headerText = {
    id: t('notification_settings.push_threads'),
    defaultMessage: 'Thread reply notifications',
};
const footerText = {
    id: t('notification_settings.push_threads.info'),
    defaultMessage: 'When enabled, any reply to a thread you\'re following will send a mobile push notification',
};

type MobilePushThreadProps = {
    onMobilePushThreadChanged: (status: string) => void;
    pushThread: PushStatus;
}

const MobilePushThread = ({pushThread, onMobilePushThreadChanged}: MobilePushThreadProps) => {
    const intl = useIntl();

    return (
        <SettingBlock
            headerText={headerText}
            footerText={footerText}
            containerStyles={styles.area}
        >
            <SettingOption
                action={onMobilePushThreadChanged}
                label={intl.formatMessage({id: 'notification_settings.push_threads.description', defaultMessage: 'Notify me about all replies to threads I\'m following'})}
                selected={pushThread === 'all'}
                type='toggle'
            />
            <SettingSeparator/>
        </SettingBlock>
    );
};

export default MobilePushThread;
