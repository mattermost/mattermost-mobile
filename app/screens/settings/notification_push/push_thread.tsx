// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import {t} from '@i18n';

import SettingBlock from '../setting_block';
import SettingOption from '../setting_option';
import SettingSeparator from '../settings_separator';

const headerText = {
    id: t('notification_settings.push_threads.replies'),
    defaultMessage: 'Thread replies',
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
        >
            <SettingOption
                action={onMobilePushThreadChanged}
                label={intl.formatMessage({id: 'notification_settings.push_threads.following', defaultMessage: 'Notify me about replies to threads I\'m following in this channel'})}
                selected={pushThread === 'all'}
                type='toggle'
            />
            <SettingSeparator/>
        </SettingBlock>
    );
};

export default MobilePushThread;
