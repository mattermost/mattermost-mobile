// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import SettingBlock from '@components/settings/block';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {t} from '@i18n';

const headerText = {
    id: t('notification_settings.mobile.trigger_push'),
    defaultMessage: 'Trigger push notifications when...',
};

type MobilePushStatusProps = {
    pushStatus: UserNotifyPropsPushStatus;
    setMobilePushStatus: (status: UserNotifyPropsPushStatus) => void;
}
const MobilePushStatus = ({pushStatus, setMobilePushStatus}: MobilePushStatusProps) => {
    const intl = useIntl();

    return (
        <SettingBlock
            headerText={headerText}
        >
            <SettingOption
                action={setMobilePushStatus}
                label={intl.formatMessage({id: 'notification_settings.mobile.online', defaultMessage: 'Online, away or offline'})}
                selected={pushStatus === 'online'}
                testID='push_notification_settings.mobile_online.option'
                type='select'
                value='online'
            />
            <SettingSeparator/>
            <SettingOption
                action={setMobilePushStatus}
                label={intl.formatMessage({id: 'notification_settings.mobile.away', defaultMessage: 'Away or offline'})}
                selected={pushStatus === 'away'}
                testID='push_notification_settings.mobile_away.option'
                type='select'
                value='away'
            />
            <SettingSeparator/>
            <SettingOption
                action={setMobilePushStatus}
                label={intl.formatMessage({id: 'notification_settings.mobile.offline', defaultMessage: 'Offline'})}
                selected={pushStatus === 'offline'}
                testID='push_notification_settings.mobile_offline.option'
                type='select'
                value='offline'
            />
            <SettingSeparator/>
        </SettingBlock>
    );
};

export default MobilePushStatus;
