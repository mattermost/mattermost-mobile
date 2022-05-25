// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import Section from '@components/section';
import SectionItem from '@components/section_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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
        <Section
            headerText={replyHeaderText}
            containerStyles={styles.area}
            headerStyles={styles.upperCase}
        >
            <SectionItem
                label={(
                    <FormattedText
                        id='notification_settings.threads_start_participate'
                        defaultMessage='Threads that I start or participate in'
                    />
                )}
                action={setReplyNotifications}
                actionType='select'
                actionValue='any'
                selected={replyNotificationType === 'any'}
            />
            <View style={styles.separator}/>
            <SectionItem
                label={(
                    <FormattedText
                        id='notification_settings.threads_start'
                        defaultMessage='Threads that I start'
                    />
                )}
                action={setReplyNotifications}
                actionType='select'
                actionValue='root'
                selected={replyNotificationType === 'root'}
            />
            <View style={styles.separator}/>
            <SectionItem
                label={(
                    <FormattedText
                        id='notification_settings.threads_mentions'
                        defaultMessage='Mentions in threads'
                    />
                )}
                action={setReplyNotifications}
                actionType='select'
                actionValue='never'
                selected={replyNotificationType === 'never'}
            />
        </Section>
    );
};

export default ReplySettings;
