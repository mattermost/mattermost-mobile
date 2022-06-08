// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Block from '@components/block';
import BlockItem from '@components/block_item';
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
            <BlockItem
                action={setReplyNotifications}
                actionType='select'
                actionValue='any'
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_start_participate', defaultMessage: 'Threads that I start or participate in'})}
                labelStyle={styles.label}
                selected={replyNotificationType === 'any'}
            />
            <View style={styles.separator}/>
            <BlockItem
                action={setReplyNotifications}
                actionType='select'
                actionValue='root'
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_start', defaultMessage: 'Threads that I start'})}
                labelStyle={styles.label}
                selected={replyNotificationType === 'root'}
            />
            <View style={styles.separator}/>
            <BlockItem
                action={setReplyNotifications}
                actionType='select'
                actionValue='never'
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_mentions', defaultMessage: 'Mentions in threads'})}
                labelStyle={styles.label}
                selected={replyNotificationType === 'never'}
            />
        </Block>
    );
};

export default ReplySettings;
