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

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        rowPicture: {
            marginHorizontal: 8,
            width: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            fontSize: 14,
        },
        rowUsername: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
        rowFullname: {
            color: theme.centerChannelColor,
            flex: 1,
            opacity: 0.6,
        },
        textWrapper: {
            flex: 1,
            flexWrap: 'wrap',
            paddingRight: 8,
        },
    };
});

type Props = {
    completeHandle: string;
    onPress: (handle: string) => void;
}

const GroupMentionItem = ({
    onPress,
    completeHandle,
}: Props) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const touchableStyle = useMemo(
        () => [style.row, {marginLeft: insets.left, marginRight: insets.right}],
        [insets.left, insets.right, style],
    );
    const completeMention = useCallback(() => {
        onPress(completeHandle);
    }, [onPress, completeHandle]);

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
            <Text style={style.rowUsername}>{`@${completeHandle} - `}</Text>
            <Text style={style.rowFullname}>{`${completeHandle}`}</Text>
        </TouchableWithFeedback>
    );
};

export default GroupMentionItem;
