// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import TouchableWithFeedback from '@app/components/touchable_with_feedback';
import {useTheme} from '@app/context/theme';
import {buttonBackgroundStyle, buttonTextStyle} from '@app/utils/buttonStyles';
import {typography} from '@app/utils/typography';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    iconWrapper: {
        height: 120,
        width: 120,
        backgroundColor: changeOpacity(theme.sidebarText, 0.08),
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 72,
        lineHeight: 72,
        color: changeOpacity(theme.sidebarText, 0.48),
    },
    header: {
        color: theme.sidebarHeaderTextColor,
        marginTop: 20,
        textAlign: 'center',
    },
    body: {
        color: theme.sidebarText,
        textAlign: 'center',
        marginTop: 4,
    },
}));

const LoadingError = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <View style={styles.iconWrapper}>
                <CompassIcon
                    name='alert-circle-outline'
                    style={styles.icon}
                />
            </View>
            <Text style={[typography('Heading', 400), styles.header]}>
                {'Couldn’t load Staff'}
            </Text>
            <Text style={[typography('Body', 200), styles.body]}>
                {'There was a problem loading the content for this team.'}
            </Text>
            <TouchableWithFeedback style={[{marginTop: 24}, buttonBackgroundStyle(theme, 'lg', 'primary', 'inverted')]}>
                <Text style={buttonTextStyle(theme, 'lg', 'primary', 'inverted')}>{'Retry'}</Text>
            </TouchableWithFeedback>
        </View>
    );
};

export default LoadingError;
