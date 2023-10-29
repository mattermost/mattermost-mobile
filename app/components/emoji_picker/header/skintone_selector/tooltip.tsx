// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Preferences} from '@constants';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    onClose: () => void;
}

const hitSlop = {top: 10, bottom: 10, left: 10, right: 10};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 24,
    },
    close: {
        flex: 1,
        alignItems: 'flex-end',
        marginLeft: 11,
    },
    descriptionContainer: {
        marginBottom: 24,
        marginTop: 12,
    },
    description: {
        color: Preferences.THEMES.denim.centerChannelColor,
        ...typography('Body', 200, 'Regular'),
    },
    titleContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: 22,
    },
    title: {
        color: Preferences.THEMES.denim.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
    },
});

const SkinSelectorTooltip = ({onClose}: Props) => {
    return (
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <FormattedText
                    id='skintone_selector.tooltip.title'
                    defaultMessage='Choose your default skin tone'
                    style={styles.title}
                    testID='skin_selector.tooltip.title'
                />
                <TouchableOpacity
                    style={styles.close}
                    hitSlop={hitSlop}
                    onPress={onClose}
                    testID='skin_selector.tooltip.close.button'
                >
                    <CompassIcon
                        color={changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.56)}
                        name='close'
                        size={18}
                    />
                </TouchableOpacity>
            </View>
            <View style={styles.descriptionContainer}>
                <FormattedText
                    id='skintone_selector.tooltip.description'
                    defaultMessage='You can now choose the skin tone you prefer to use for your emojis.'
                    style={styles.description}
                    testID='skin_selector.tooltip.description'
                />
            </View>
        </View>
    );
};

export default SkinSelectorTooltip;
