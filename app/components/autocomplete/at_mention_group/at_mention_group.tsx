// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {
    Text,
    View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {typography} from '@app/utils/typography';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

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
}

const GroupMentionItem = ({
    onPress,
    name,
    displayName,
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

    return (
        <TouchableWithFeedback
            onPress={completeMention}
            style={touchableStyle}
            type={'opacity'}
        >
            <View style={style.rowPicture}>
                <CompassIcon
                    name='account-multiple-outline'
                    style={style.rowIcon}
                />
            </View>
            <View style={style.rowInfo}>
                <Text style={style.rowDisplayName}>{`${displayName} `}</Text>
                <Text style={style.rowName}>{`@${name}`}</Text>
            </View>
        </TouchableWithFeedback>
    );
};

export default GroupMentionItem;
