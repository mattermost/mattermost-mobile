// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {View} from 'react-native';

import Block from '@components/block';
import BlockItem from '@components/block_item';
import FormattedText from '@components/formatted_text';
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
        area: {
            paddingHorizontal: 16,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
            marginLeft: 15,
        },
        upperCase: {
            textTransform: 'uppercase',
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 400, 'Regular'),
            fontSize: 16,
            lineHeight: 24,
        },
    };
});

const ReplySettings = () => {
    const [replyNotificationType, setReplyNotificationType] = useState('any'); //todo: initialize with value from db/api
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const setReplyNotifications = (notifType: string) => {
        setReplyNotificationType(notifType);
    };

    return (
        <Block
            headerText={replyHeaderText}
            containerStyles={styles.area}
            headerStyles={styles.upperCase}
        >
            <BlockItem
                label={(
                    <FormattedText
                        id='notification_settings.threads_start_participate'
                        defaultMessage='Threads that I start or participate in'
                        style={styles.label}
                    />
                )}
                action={setReplyNotifications}
                actionType='select'
                actionValue='any'
                selected={replyNotificationType === 'any'}
            />
            <View style={styles.separator}/>
            <BlockItem
                label={(
                    <FormattedText
                        id='notification_settings.threads_start'
                        defaultMessage='Threads that I start'
                        style={styles.label}
                    />
                )}
                action={setReplyNotifications}
                actionType='select'
                actionValue='root'
                selected={replyNotificationType === 'root'}
            />
            <View style={styles.separator}/>
            <BlockItem
                label={(
                    <FormattedText
                        id='notification_settings.threads_mentions'
                        defaultMessage='Mentions in threads'
                        style={styles.label}
                    />
                )}
                action={setReplyNotifications}
                actionType='select'
                actionValue='never'
                selected={replyNotificationType === 'never'}
            />
        </Block>
    );
};

export default ReplySettings;
