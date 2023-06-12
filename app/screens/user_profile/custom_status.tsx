// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {View} from 'react-native';

import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import CustomStatusExpiry from '@components/custom_status/custom_status_expiry';
import CustomStatusText from '@components/custom_status/custom_status_text';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    customStatus: UserCustomStatus;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginVertical: 8,
    },
    row: {
        flexDirection: 'row',
    },
    description: {
        color: theme.centerChannelColor,
        flex: 1,
        ...typography('Body', 200),
    },
    title: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginBottom: 2,
        ...typography('Body', 50, 'SemiBold'),
    },
    expiry: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginLeft: 3,
        marginBottom: 2,
        textTransform: 'lowercase',
        ...typography('Body', 50, 'SemiBold'),
    },
    emoji: {
        marginRight: 8,
    },
}));

const UserProfileCustomStatus = ({customStatus}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <FormattedText
                    id='user_profile.custom_status'
                    defaultMessage='Custom Status'
                    style={styles.title}
                    testID={'user_profile.custom_status.title'}
                />
                {Boolean(customStatus?.duration) &&
                <CustomStatusExpiry
                    time={moment(customStatus.expires_at)}
                    theme={theme}
                    textStyles={styles.expiry}
                    withinBrackets={true}
                    showPrefix={true}
                    testID={`user_profile.${customStatus.duration}.custom_status_expiry`}
                />
                }
            </View>
            <View style={styles.row}>
                {Boolean(customStatus.emoji) &&
                <CustomStatusEmoji
                    customStatus={customStatus}
                    emojiSize={24}
                    style={styles.emoji}
                />
                }
                <CustomStatusText
                    text={customStatus.text}
                    theme={theme}
                    textStyle={styles.description}
                />
            </View>
        </View>
    );
};

export default UserProfileCustomStatus;
