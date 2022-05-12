// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import MenuItem from '@components/menu_item';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export const MODIFIER_LABEL_HEIGHT = 48;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        modifierItemLabelContainer: {
            marginLeft: 20,
            height: 48,
            alignItems: 'center',
            textAlign: 'center',
            margin: 'auto',
            flexDirection: 'row',
        },
        modifierLabelValue: {
            marginBottom: 4,
            marginLeft: 16,
            color: theme.centerChannelColor,
            ...typography('Body', 400, 'SemiBold'),
        },
        modifierItemDescription: {
            marginBottom: 4,
            fontSize: 16,
            color: theme.centerChannelColor,
            ...typography('Body', 400, 'Regular'),
        },
    };
});

export type ModifierItem = {
        description: string;
        modifier: string;
        testID: string;
        id: string;
        value: string;
}

type Props = {
    item: ModifierItem;
    setSearchValue: (value: string) => void;
    searchValue?: string;
}

const Modifier = ({item, searchValue, setSearchValue}: Props) => {
    const theme = useTheme();

    const handlePress = useCallback(() => {
        setModifierValue(item.value);
    }, [item.value]);

    const style = getStyleFromTheme(theme);

    const setModifierValue = preventDoubleTap((modifier) => {
        let newValue = '';

        if (!searchValue) {
            newValue = modifier;
        } else if (searchValue.endsWith(' ')) {
            newValue = `${searchValue}${modifier}`;
        } else {
            newValue = `${searchValue} ${modifier}`;
        }

        setSearchValue(newValue);
    });

    return (
        <MenuItem
            testID={item.testID}
            onPress={handlePress}
            labelComponent={
                <View style={style.modifierItemLabelContainer}>
                    <CompassIcon
                        name='plus-box-outline'
                        size={24}
                        color={changeOpacity(theme.centerChannelColor, 0.6)}
                    />
                    <Text style={style.modifierLabelValue}>{item.value}</Text>
                    <Text style={style.modifierItemDescription}>{item.description}</Text>
                </View>
            }

            i18nId={item.id}
            separator={false}
            theme={theme}
        />
    );
};

export default Modifier;
