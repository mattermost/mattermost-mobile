// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {ScrollView, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import Section from '@components/section';
import SectionItem from '@components/section_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import MentionSettings from './mention_settings';

import type UserModel from '@typings/database/models/servers/user';

const replyHeaderText = {
    id: t('notification_settings.mention.reply'),
    defaultMessage: 'SEND REPLY NOTIFICATIONS FOR',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 12,
            height: 40,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        },
        scrollViewContent: {
            paddingVertical: 35,
        },
    };
});

type NotificationMentionProps = {
    isCRTEnabled?: boolean;
    currentUser?: UserModel;
    mentionKeys: string;
}
const NotificationMention = ({currentUser, mentionKeys, isCRTEnabled}: NotificationMentionProps) => {
    const [replyNotificationType, setReplyNotificationType] = useState('any'); //todo: initialize with value from db/api
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const setReplyNotifications = (notifType: string) => {
        setReplyNotificationType(notifType);
    };

    const renderReplySection = () => {
        return (
            <Section
                headerText={replyHeaderText}
                containerStyles={styles.area}
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

    return (
        <SafeAreaView
            edges={['left', 'right']}
            testID='notification_settings.screen'
            style={styles.container}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                alwaysBounceVertical={false}
            >
                <MentionSettings
                    mentionKeys={mentionKeys}
                    currentUser={currentUser}
                />
                {!isCRTEnabled && (
                    renderReplySection()
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationMention;

