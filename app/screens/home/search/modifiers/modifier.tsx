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
        container: {
            flext: 1,
            height: MODIFIER_LABEL_HEIGHT,
            marginLeft: 20,
            justifyContent: 'center',
        },
        modifierItemLabelContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: -4,
        },
        icon: {
            marginTop: 3,
        },
        modifierLabelValue: {
            marginLeft: 16,
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'SemiBold'),
        },
        modifierItemDescription: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
    };
});

export type ModifierItem = {
        description: string;
        testID: string;
        term: string;
}

type Props = {
    item: ModifierItem;
    setSearchValue: (value: string) => void;
    searchValue?: string;
}

const Modifier = ({item, searchValue, setSearchValue}: Props) => {
    const theme = useTheme();

    const handlePress = useCallback(() => {
        addModifierTerm(item.term);
    }, [item.term, searchValue]);

    const style = getStyleFromTheme(theme);

    const addModifierTerm = preventDoubleTap((modifierTerm) => {
        let newValue = '';
        if (!searchValue) {
            newValue = modifierTerm;
        } else if (searchValue.endsWith(' ')) {
            newValue = `${searchValue}${modifierTerm}`;
        } else {
            newValue = `${searchValue} ${modifierTerm}`;
        }

        setSearchValue(newValue);
    });

    return (
        <MenuItem
            containerStyle={style.container}
            testID={item.testID}
            onPress={handlePress}
            labelComponent={
                <View style={style.modifierItemLabelContainer}>
                    <CompassIcon
                        name='plus-box-outline'
                        size={24}
                        color={changeOpacity(theme.centerChannelColor, 0.6)}
                        style={style.icon}
                    />
                    <Text style={style.modifierLabelValue}>{item.term}</Text>
                    <Text style={style.modifierItemDescription}>{' ' + item.description}</Text>
                </View>
            }
            separator={false}
            theme={theme}
        />
    );
};

export default Modifier;
