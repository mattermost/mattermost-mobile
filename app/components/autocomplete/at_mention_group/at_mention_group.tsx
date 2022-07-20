// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {
    Text,
    View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            height: 40,
            paddingVertical: 8,
            paddingTop: 4,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
        },
        rowPicture: {
            marginRight: 10,
            marginLeft: 2,
            width: 24,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            fontSize: 22,
        },
        rowInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            overflow: 'hidden',
            maxWidth: '80%',
            paddingLeft: 3,
        },
        rowDisplayName: {
            color: theme.centerChannelColor,
            flexShrink: 5,
            ...typography('Body', 200),
        },
        rowName: {
            ...typography('Body', 200),
            color: changeOpacity(theme.centerChannelColor, 0.64),
            flexShrink: 1,
            marginLeft: 2,
        },
    };
});

type Props = {
    name: string;
    displayName: string;
    onPress: (handle: string) => void;
    testID?: string;
}

const GroupMentionItem = ({
    onPress,
    name,
    displayName,
    testID,
}: Props) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const touchableStyle = useMemo(
        () => [style.row, {marginLeft: insets.left, marginRight: insets.right}],
        [insets.left, insets.right, style],
    );
    const completeMention = useCallback(() => {
        onPress(name);
    }, [onPress, name]);

    const groupMentionItemTestId = `${testID}.${name}`;

    return (
        <TouchableWithFeedback
            onPress={completeMention}
            style={touchableStyle}
            type={'opacity'}
            testID={groupMentionItemTestId}
        >
            <View style={style.rowPicture}>
                <CompassIcon
                    name='account-multiple-outline'
                    style={style.rowIcon}
                />
            </View>
            <View style={style.rowInfo}>
                <Text
                    style={style.rowDisplayName}
                    testID={`${groupMentionItemTestId}.display_name`}
                >
                    {`${displayName} `}
                </Text>
                <Text
                    style={style.rowName}
                    testID={`${groupMentionItemTestId}.name`}
                >
                    {`@${name}`}
                </Text>
            </View>
        </TouchableWithFeedback>
    );
};

export default GroupMentionItem;
