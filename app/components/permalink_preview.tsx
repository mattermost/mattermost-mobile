// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {useTheme} from '@react-navigation/native';
import React from 'react';
import {StyleSheet, View, Text} from 'react-native';

import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type PermalinkPreviewProps = {
    authorName: string;
    timestamp: string;
    message: string;
    footerText: string;
    avatarUrl?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(63, 67, 80, 0.16)',
        borderRadius: 4,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 3,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    body: {
        flex: 1,
    },
    authorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    authorName: {
        ...typography('Body', 600),
        color: '#3F4350',
        marginRight: 6,
    },
    timestamp: {
        ...typography('Caption', 400),
        color: 'rgba(63, 67, 80, 0.64)',
    },
    message: {
        ...typography('Body', 400),
        color: '#3F4350',
    },
    footer: {
        ...typography('Caption', 400),
        color: '#3F4350',
    },
}));

const PermalinkPreview: React.FC<PermalinkPreviewProps> = ({
    authorName,
    timestamp,
    message,
    footerText,
    avatarUrl,
}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <View style={styles.messageContainer}>
                <View style={styles.body}>
                    <View style={styles.authorContainer}>
                        <View style={styles.avatar}>
                            {/* Avatar component would go here */}
                        </View>
                        <View style={styles.authorInfo}>
                            <Text style={styles.authorName}>{authorName}</Text>
                            <Text style={styles.timestamp}>{timestamp}</Text>
                        </View>
                    </View>
                    <Text style={styles.message}>{message}</Text>
                </View>
            </View>
            <Text style={styles.footer}>{footerText}</Text>
        </View>
    );
};

export default PermalinkPreview;
