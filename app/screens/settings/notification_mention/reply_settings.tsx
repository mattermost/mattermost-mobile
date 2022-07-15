// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';

import {t} from '@i18n';

import SettingBlock from '../setting_block';
import SettingOption from '../setting_option';
import SettingSeparator from '../settings_separator';

const replyHeaderText = {
    id: t('notification_settings.mention.reply'),
    defaultMessage: 'Send reply notifications for',
};

const ReplySettings = () => {
    const [replyNotificationType, setReplyNotificationType] = useState('any');
    const intl = useIntl();

    return (
        <SettingBlock
            headerText={replyHeaderText}
        >
            <SettingOption
                action={setReplyNotificationType}
                label={intl.formatMessage({id: 'notification_settings.threads_start_participate', defaultMessage: 'Threads that I start or participate in'})}
                selected={replyNotificationType === 'any'}
                type='select'
                value='any'
            />
            <SettingSeparator/>
            <SettingOption
                action={setReplyNotificationType}
                label={intl.formatMessage({id: 'notification_settings.threads_start', defaultMessage: 'Threads that I start'})}
                selected={replyNotificationType === 'root'}
                type='select'
                value='root'
            />
            <SettingSeparator/>
            <SettingOption
                action={setReplyNotificationType}
                label={intl.formatMessage({id: 'notification_settings.threads_mentions', defaultMessage: 'Mentions in threads'})}
                selected={replyNotificationType === 'never'}
                type='select'
                value='never'
            />
        </SettingBlock>
    );
};

export default ReplySettings;
