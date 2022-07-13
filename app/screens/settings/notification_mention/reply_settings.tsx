// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import SettingBlock from '../setting_block';
import SettingSeparator from '../settings_separator';

const replyHeaderText = {
    id: t('notification_settings.mention.reply'),
    defaultMessage: 'Send reply notifications for',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            width: '90%',
            alignSelf: 'center',
        },
        optionLabelTextStyle: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
            marginBottom: 4,
        },
    };
});

const ReplySettings = () => {
    const [replyNotificationType, setReplyNotificationType] = useState('any'); //todo: initialize with value from db/api
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const setReplyNotifications = (notifType: string) => {
        setReplyNotificationType(notifType);
    };

    return (
        <SettingBlock
            headerText={replyHeaderText}
        >
            <OptionItem
                action={setReplyNotifications}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_start_participate', defaultMessage: 'Threads that I start or participate in'})}
                optionLabelTextStyle={styles.optionLabelTextStyle}
                selected={replyNotificationType === 'any'}
                type='select'
                value='any'
            />
            <SettingSeparator/>
            <OptionItem
                action={setReplyNotifications}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_start', defaultMessage: 'Threads that I start'})}
                optionLabelTextStyle={styles.optionLabelTextStyle}
                selected={replyNotificationType === 'root'}
                type='select'
                value='root'
            />
            <SettingSeparator/>
            <OptionItem
                action={setReplyNotifications}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_mentions', defaultMessage: 'Mentions in threads'})}
                optionLabelTextStyle={styles.optionLabelTextStyle}
                selected={replyNotificationType === 'never'}
                type='select'
                value='never'
            />
        </SettingBlock>
    );
};

export default ReplySettings;
