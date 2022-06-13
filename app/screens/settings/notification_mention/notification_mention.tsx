// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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
            height: 40,
            ...typography('Body', 75, 'Regular'),
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
    componentId: string;
    currentUser: UserModel;
    isCRTEnabled: boolean;
}
const NotificationMention = ({componentId, currentUser, isCRTEnabled}: NotificationMentionProps) => {
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
                    currentUser={currentUser}
                    componentId={componentId}
                />
                {!isCRTEnabled && (
                    <ReplySettings/>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationMention;

