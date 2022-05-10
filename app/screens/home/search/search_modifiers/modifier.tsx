// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableHighlight, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export const MODIFIER_LABEL_HEIGHT = 48;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        modifierItemContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            height: MODIFIER_LABEL_HEIGHT,
        },
        modifierItemWrapper: {
            flex: 1,
            flexDirection: 'column',
            paddingHorizontal: 16,
        },
        modifierItemLabelContainer: {
            alignItems: 'center',
            flexDirection: 'row',
        },
        modifierLabelValue: {
            marginLeft: 16,
            ...typography('Body', 400, 'SemiBold'),
            color: theme.centerChannelColor,
        },
        modifierItemDescription: {
            fontSize: 16,
            ...typography('Body', 400, 'Regular'),
            color: theme.centerChannelColor,
        },
    };
});

export type ModifierItem = {
        description: string;
        modifier: string;
        testID: string;
        value: string;
}

type Props = {
    item: ModifierItem;
    setModifierValue: (val: string) => void;
}

const Modifier = ({item, setModifierValue}: Props) => {
    const theme = useTheme();

    const handlePress = useCallback(() => {
        setModifierValue(item.value);
    }, [item.value]);

    const style = getStyleFromTheme(theme);

    return (
        <TouchableHighlight
            key={item.modifier}
            underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
            onPress={handlePress}
            testID={item.testID}
            style={style.modifierItemContainer}
        >
            <View style={style.modifierItemWrapper}>
                <View style={style.modifierItemLabelContainer}>
                    <CompassIcon
                        name='plus-box-outline'
                        size={24}
                        color={changeOpacity(theme.centerChannelColor, 0.6)}
                    />
                    <Text
                        style={style.modifierLabelValue}
                    >
                        {item.value}
                    </Text>
                    <Text style={style.modifierItemDescription}>
                        {item.description}
                    </Text>
                </View>
            </View>
        </TouchableHighlight>
    );
};

export default Modifier;
