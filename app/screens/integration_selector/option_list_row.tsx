// Copyright (c) 2022-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    GestureResponderEvent,
    Text,
    View,
} from 'react-native';

import { makeStyleSheetFromTheme } from '@utils/theme';

import CustomListRow, { Props as CustomListRowProps } from './custom_list_row';

type OptionListRowProps = {
    id: string,
    theme: object,
    item: { text: string, value: string },  // TODO I don't think this goes here, but It seems broken in @master
}

type Props = OptionListRowProps & CustomListRowProps;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            height: 65,
            paddingHorizontal: 15,
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        textContainer: {
            marginLeft: 10,
            justifyContent: 'center',
            flexDirection: 'column',
            flex: 1,
        },
        optionText: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
    };
});


const OptionListRow = ({
    enabled, selectable, selected, theme, item, onPress, id,
}: Props) => {
    const { text, value } = item;
    const style = getStyleFromTheme(theme);

    const onPressRow = (event: GestureResponderEvent): void => {
        if (onPress) {
            onPress(id, item);
        }
    };

    return (
        <View style={style.container}>
            <CustomListRow
                id={value}
                onPress={onPressRow}
                enabled={enabled}
                selectable={selectable}
                selected={selected}
            >
                <View style={style.textContainer}>
                    <View>
                        <Text style={style.optionText}>
                            {text}
                        </Text>
                    </View>
                </View>
            </CustomListRow>
        </View>
    );
}


export default OptionListRow;
