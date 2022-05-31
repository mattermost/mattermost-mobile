// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Block from '@components/block';
import BlockItem from '@components/block_item';
import FormattedText from '@components/formatted_text';
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

    return (
        <Block
            containerStyles={styles.containerStyles}
            disableHeader={true}
        >
            <BlockItem
                action={setTheme}
                actionType='select'
                actionValue={customTheme.type}
                label={(
                    <FormattedText
                        id='user.settings.display.custom_theme'
                        defaultMessage={'Custom Theme'}
                        style={styles.label}
                    />
                )}
                selected={theme.type?.toLowerCase() === customTheme.type?.toLowerCase()}
            />
        </Block>
    );
};

export default CustomTheme;
