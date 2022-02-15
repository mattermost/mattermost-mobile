// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
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
    iconContainerStyle: {
        marginLeft: 0,
    },
}));

type BaseOptionType = {
    i18nId: string;
    defaultMessage: string;
    iconName: string;
    onPress: () => void;
    testID: string;
    isDestructive?: boolean;
}

const BaseOption = ({
    i18nId,
    defaultMessage,
    iconName,
    onPress,
    testID,
    isDestructive = false,
}: BaseOptionType) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const labelStyles = useMemo(() => {
        if (isDestructive) {
            return [styles.label, styles.destructive];
        }
        return styles.label;
    }, [isDestructive, styles.label, styles.destructive]);

    const label = useMemo(() => (
        <FormattedText
            id={i18nId}
            defaultMessage={defaultMessage}
            style={labelStyles}
        />
    ), [i18nId, defaultMessage, labelStyles]);

    return (
        <MenuItem
            testID={testID}
            labelComponent={label}
            iconContainerStyle={styles.iconContainerStyle}
            iconName={iconName}
            onPress={onPress}
            separator={false}
            theme={theme}
            isDestructor={isDestructive}
        />
    );
};
export default BaseOption;
