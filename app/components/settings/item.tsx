// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem, {type OptionItemProps} from '@components/option_item';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Options, {DisplayOptionConfig, NotificationsOptionConfig, SettingOptionConfig} from '../../screens/settings/config';

import SettingSeparator from './separator';

type SettingsConfig = keyof typeof SettingOptionConfig | keyof typeof NotificationsOptionConfig| keyof typeof DisplayOptionConfig
type SettingOptionProps = {
    optionName: SettingsConfig;
    onPress: () => void;
    separator?: boolean;
} & Partial<OptionItemProps>;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        menuLabel: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        chevronStyle: {
            marginRight: 14,
            color: changeOpacity(theme.centerChannelColor, 0.32),
        },
    };
});

const SettingItem = ({
    info,
    onPress,
    optionName,
    separator = true,
    ...props
}: SettingOptionProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const config = Options[optionName];

    const label = props.label || intl.formatMessage({id: config.i18nId, defaultMessage: config.defaultMessage});

    return (
        <>
            <OptionItem
                action={onPress}
                arrowStyle={styles.chevronStyle}
                containerStyle={{marginLeft: 16}}
                icon={config.icon}
                info={info}
                label={label}
                optionLabelTextStyle={[styles.menuLabel, props.optionLabelTextStyle]}
                type={Platform.select({ios: 'arrow', default: 'default'})}
                {...props}
            />
            {separator && <SettingSeparator/>}
        </>
    );
};

export default SettingItem;
