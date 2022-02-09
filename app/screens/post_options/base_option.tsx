// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';

type BaseOptionType = {
    i18nId: string;
    defaultMessage: string;
    iconName: string;
    onPress: () => void;
    optionType: string;
}

const BaseOption = ({
    i18nId,
    defaultMessage,
    iconName,
    onPress,
    optionType,
}: BaseOptionType) => {
    const theme = useTheme();
    return (
        <DrawerItem
            testID={optionType}
            labelComponent={
                <FormattedText
                    id={i18nId}
                    defaultMessage={defaultMessage}
                />
            }
            iconName={iconName}
            onPress={onPress}
            separator={false}
            theme={theme}
        />
    );
};
export default BaseOption;
