// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';

import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    destructive: {
        color: theme.dndIndicator,
    },
    label: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
}));

type BaseOptionType = {
    i18nId: string;
    defaultMessage: string;
    iconName: string;
    onPress: () => void;
    optionType: string;
    isDestructive?: boolean;
}

const BaseOption = ({
    i18nId,
    defaultMessage,
    iconName,
    onPress,
    optionType,
    isDestructive = false,
}: BaseOptionType) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const labelStyles = useMemo(() => {
        if (isDestructive) {
            return StyleSheet.flatten([styles.label, styles.destructive]);
        }
        return styles.label;
    }, [theme, isDestructive, styles]);

    return (
        <DrawerItem
            testID={optionType}
            labelComponent={
                <FormattedText
                    id={i18nId}
                    defaultMessage={defaultMessage}
                    style={labelStyles}
                />
            }
            iconName={iconName}
            onPress={onPress}
            separator={false}
            theme={theme}
            isDestructor={isDestructive}
        />
    );
};
export default BaseOption;
