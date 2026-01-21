// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import NavigationButton from '@components/navigation_button';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    action?: string;
    enabled?: boolean;
    onPress?: () => void;
    title: string;
    testID: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    actionContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        right: 20,
        bottom: 7,
        position: 'absolute',
    },
    container: {
        backgroundColor: theme.centerChannelBg,
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
        flexDirection: 'row',
        height: 34,
        width: '100%',
        alignItems: 'center',
        paddingBottom: 5,
    },
    enabled: {
        color: theme.sidebarHeaderTextColor,
    },
    titleContainer: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Body', 300, 'SemiBold'),
    },
}));

const TabletTitle = ({action, enabled = true, onPress, testID, title}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <>
            <View style={styles.container}>
                <View style={styles.titleContainer}>
                    <Text
                        style={styles.title}
                        testID={`${testID}.title`}
                    >
                        {title}
                    </Text>
                </View>
                {Boolean(action) &&
                <View style={styles.actionContainer}>
                    <NavigationButton
                        text={action!}
                        disabled={!enabled}
                        onPress={onPress!}
                        testID={`${testID}.${action!.toLocaleLowerCase()}.button`}
                        count={20}
                        iconName='plus'
                    />
                </View>
                }
            </View>
        </>
    );
};

export default TabletTitle;
