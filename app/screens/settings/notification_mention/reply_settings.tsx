// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Block from '@components/block';
import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const replyHeaderText = {
    id: t('notification_settings.mention.reply'),
    defaultMessage: 'Send reply notifications for',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
        },
        upperCase: {
            textTransform: 'uppercase',
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        container: {
            paddingHorizontal: 8,
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
        <Block
            headerText={replyHeaderText}
            headerStyles={styles.upperCase}
        >
            <OptionItem
                action={setReplyNotifications}
                type='select'
                value='any'
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_start_participate', defaultMessage: 'Threads that I start or participate in'})}
                selected={replyNotificationType === 'any'}
            />
            <View style={styles.separator}/>
            <OptionItem
                action={setReplyNotifications}
                type='select'
                value='root'
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_start', defaultMessage: 'Threads that I start'})}
                selected={replyNotificationType === 'root'}
            />
            <View style={styles.separator}/>
            <OptionItem
                action={setReplyNotifications}
                type='select'
                value='never'
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_mentions', defaultMessage: 'Mentions in threads'})}
                selected={replyNotificationType === 'never'}
            />
        </Block>
    );
};

export default ReplySettings;
