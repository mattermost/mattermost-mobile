// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';

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
            ...Platform.select({
                ios: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
                    width: '91%',
                    alignSelf: 'center',
                    height: 1,
                    marginTop: 12,
                },
                default: {
                    display: 'none',
                },
            }),
        },
        blockHeader: {
            color: theme.centerChannelColor,
            ...typography('Heading', 300, 'SemiBold'),
            marginBottom: 16,
            marginLeft: 18,
        },
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
        <Block
            headerText={replyHeaderText}
            headerStyles={styles.blockHeader}
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
            <View style={styles.separator}/>
            <OptionItem
                action={setReplyNotifications}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_start', defaultMessage: 'Threads that I start'})}
                optionLabelTextStyle={styles.optionLabelTextStyle}
                selected={replyNotificationType === 'root'}
                type='select'
                value='root'
            />
            <View style={styles.separator}/>
            <OptionItem
                action={setReplyNotifications}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.threads_mentions', defaultMessage: 'Mentions in threads'})}
                optionLabelTextStyle={styles.optionLabelTextStyle}
                selected={replyNotificationType === 'never'}
                type='select'
                value='never'
            />
        </Block>
    );
};

export default ReplySettings;
