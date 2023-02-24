// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import SettingBlock from '@components/settings/block';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {t} from '@i18n';

const headerText = {
    id: t('notification_settings.push_threads.replies'),
    defaultMessage: 'Thread replies',
};

type MobilePushThreadProps = {
    onMobilePushThreadChanged: (status: string) => void;
    pushThread: UserNotifyPropsPushThreads;
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
                testID='push_notification_settings.push_threads_following.option'
                type='toggle'
            />
            <SettingSeparator/>
        </SettingBlock>
    );
};

export default MobilePushThread;
