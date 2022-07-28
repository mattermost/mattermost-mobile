// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform} from 'react-native';

import MenuItem, {MenuItemProps} from '@components/menu_item';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Options, {DisplayOptionConfig, NotificationsOptionConfig, SettingOptionConfig} from './config';

type SettingsConfig = keyof typeof SettingOptionConfig | keyof typeof NotificationsOptionConfig| keyof typeof DisplayOptionConfig
type SettingOptionProps = {
    optionName: SettingsConfig;
    onPress: () => void;
} & Omit<MenuItemProps, 'testID'| 'theme'>;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        menuLabel: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        separatorStyle: {
            width: '91%',
            alignSelf: 'center',
        },
        chevronStyle: {
            marginRight: 14,
            color: changeOpacity(theme.centerChannelColor, 0.32),
        },
    };
});

const SettingItem = ({onPress, optionName, ...rest}: SettingOptionProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const props = {...rest, ...Options[optionName]} as unknown as Omit<MenuItemProps, 'onPress'| 'theme'>;

    return (
        <MenuItem
            chevronStyle={styles.chevronStyle}
            labelStyle={styles.menuLabel}
            onPress={onPress}
            separator={Platform.OS === 'ios'}
            separatorStyle={styles.separatorStyle}
            showArrow={Platform.select({ios: true, default: false})}
            {...props}
        />
    );
};

export default SettingItem;
