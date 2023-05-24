// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type Dispatch, type SetStateAction} from 'react';
import {useIntl} from 'react-intl';

import SettingBlock from '@components/settings/block';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {t} from '@i18n';

const replyHeaderText = {
    id: t('notification_settings.mention.reply'),
    defaultMessage: 'Send reply notifications for',
};
type ReplySettingsProps = {
    replyNotificationType: string;
    setReplyNotificationType: Dispatch<SetStateAction<string>>;
}
const ReplySettings = ({replyNotificationType, setReplyNotificationType}: ReplySettingsProps) => {
    const intl = useIntl();

    return (
        <SettingBlock
            headerText={replyHeaderText}
        >
            <SettingOption
                action={setReplyNotificationType}
                label={intl.formatMessage({id: 'notification_settings.threads_start_participate', defaultMessage: 'Threads that I start or participate in'})}
                selected={replyNotificationType === 'any'}
                testID='mention_notification_settings.threads_start_participate.option'
                type='select'
                value='any'
            />
            <SettingSeparator/>
            <SettingOption
                action={setReplyNotificationType}
                label={intl.formatMessage({id: 'notification_settings.threads_start', defaultMessage: 'Threads that I start'})}
                selected={replyNotificationType === 'root'}
                testID='mention_notification_settings.threads_start.option'
                type='select'
                value='root'
            />
            <SettingSeparator/>
            <SettingOption
                action={setReplyNotificationType}
                label={intl.formatMessage({id: 'notification_settings.threads_mentions', defaultMessage: 'Mentions in threads'})}
                selected={replyNotificationType === 'never'}
                testID='mention_notification_settings.threads_mentions.option'
                type='select'
                value='never'
            />
        </SettingBlock>
    );
};

export default ReplySettings;
