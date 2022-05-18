// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform} from 'react-native';

import MenuItem, {MenuItemProps} from '@components/menu_item';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {SettingOptionConfig} from './constant';

type Props = {
    type: 'notification' | 'display' | 'advanced_settings' | 'about' | 'help';
    onPress: () => void;
} & Omit<MenuItemProps, 'testID'| 'theme'>;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        menuLabel: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
    };
});

const SettingOption = ({type, onPress, ...rest}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const optionConfig = SettingOptionConfig[type];
    const options = {...optionConfig, ...rest};

    return (
        <MenuItem
            labelStyle={styles.menuLabel}
            onPress={onPress}
            separator={true}
            showArrow={Platform.select({ios: true, default: false})}
            theme={theme}
            {...options}
        />
    );
};

export default SettingOption;
