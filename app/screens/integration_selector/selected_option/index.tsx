// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {View as ViewConstants} from '@constants';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    theme: Theme;
    option: DialogOption | UserProfile | Channel;
    dataSource: string;
    onRemove: (opt: DialogOption | UserProfile | Channel) => void;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 27,
            borderRadius: 3,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            marginBottom: 4,
            marginRight: 10,
            paddingLeft: 10,
        },
        remove: {
            paddingHorizontal: 10,
        },
        text: {
            color: theme.centerChannelColor,
            maxWidth: '90%',
            ...typography('Body', 100, 'Regular'),
        },
    };
});

const SelectedOption = ({theme, option, onRemove, dataSource}: Props) => {
    const style = getStyleFromTheme(theme);
    const onPress = useCallback(
        () => onRemove(option),
        [onRemove, option],
    );

    let text;
    switch (dataSource) {
        case ViewConstants.DATA_SOURCE_USERS:
            text = (option as UserProfile).username;
            break;
        case ViewConstants.DATA_SOURCE_CHANNELS:
            text = (option as Channel).display_name;
            break;
        default:
            text = (option as DialogOption).text;
            break;
    }

    return (
        <View style={style.container}>
            <Text
                style={style.text}
                numberOfLines={1}
            >
                {text}
            </Text>
            <TouchableOpacity
                style={style.remove}
                onPress={onPress}
            >
                <CompassIcon
                    name='close'
                    size={14}
                    color={theme.centerChannelColor}
                />
            </TouchableOpacity>
        </View>
    );
};

export default SelectedOption;
