// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {
    Text,
    View,
} from 'react-native';

import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CustomListRow, {type Props as CustomListRowProps} from '../custom_list_row';

type OptionListRowProps = {
    id: string;
    theme: Theme;
    item: { text: string; value: string };
    onPress: (item: DialogOption) => void;
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
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
    };
});

const OptionListRow = ({
    enabled, selectable, selected, theme, item, onPress, id,
}: Props) => {
    const {text} = item;
    const style = getStyleFromTheme(theme);

    const onPressRow = useCallback((): void => {
        onPress(item);
    }, [onPress, item]);

    return (
        <View style={style.container}>
            <CustomListRow
                id={id}
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
};

export default OptionListRow;
