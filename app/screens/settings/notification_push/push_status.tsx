// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import {t} from '@i18n';

import SettingBlock from '../setting_block';
import SettingOption from '../setting_option';
import SettingSeparator from '../settings_separator';

const headerText = {
    id: t('notification_settings.mobile.trigger_push'),
    defaultMessage: 'Trigger push notifications when...',
};

type MobilePushStatusProps = {
    pushStatus: PushStatus;
    setMobilePushStatus: (status: PushStatus) => void;
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
                type='select'
                value='online'
            />
            <SettingSeparator/>
            <SettingOption
                action={setMobilePushStatus}
                label={intl.formatMessage({id: 'notification_settings.mobile.away', defaultMessage: 'Away or offline'})}
                selected={pushStatus === 'away'}
                type='select'
                value='away'
            />
            <SettingSeparator/>
            <SettingOption
                action={setMobilePushStatus}
                label={intl.formatMessage({id: 'notification_settings.mobile.offline', defaultMessage: 'Offline'})}
                selected={pushStatus === 'offline'}
                type='select'
                value='offline'
            />
            <SettingSeparator/>
        </SettingBlock>
    );
};

export default MobilePushStatus;
