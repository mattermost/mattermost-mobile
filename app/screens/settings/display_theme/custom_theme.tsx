// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import Block from '@components/block';
import BlockItem from '@components/block_item';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        containerStyles: {
            paddingHorizontal: 16,
        },
    };
});

type CustomThemeProps = {
    customTheme: Theme;
    setTheme: (themeKey: string) => void;
}

const CustomTheme = ({customTheme, setTheme}: CustomThemeProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    return (
        <Block
            containerStyles={styles.containerStyles}
            disableHeader={true}
        >
            <BlockItem
                action={setTheme}
                actionType='select'
                actionValue={customTheme.type}
                label={intl.formatMessage({id: 'user.settings.display.custom_theme', defaultMessage: 'Custom Theme'})}
                labelStyle={styles.label}
                selected={theme.type?.toLowerCase() === customTheme.type?.toLowerCase()}
            />
        </Block>
    );
};

export default CustomTheme;
