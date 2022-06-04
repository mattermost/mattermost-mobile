// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import MentionSettings from './mention_settings';
import ReplySettings from './reply_settings';

import type UserModel from '@typings/database/models/servers/user';

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
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <SafeAreaView
            edges={['left', 'right']}
            testID='notification_mention.screen'
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
                    <ReplySettings/>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationMention;

