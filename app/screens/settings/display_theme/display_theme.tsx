// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ScrollView, View} from 'react-native';

import Block from '@components/block';
import BlockItem from '@components/block_item';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {ThemeTiles} from './theme_tiles';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            paddingTop: 35,
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        containerStyles: {
            paddingHorizontal: 16,
        },
    };
});

type DisplayThemeProps = {
    allowedThemeKeys: string[];
    customTheme?: Theme;
}
const DisplayTheme = ({allowedThemeKeys, customTheme}: DisplayThemeProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const setTheme = () => {
        //todo:
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.wrapper}>
                <ThemeTiles
                    onThemeChange={setTheme}
                    allowedThemeKeys={allowedThemeKeys}
                />
                {customTheme &&
                <Block
                    disableHeader={true}
                    containerStyles={styles.containerStyles}
                >
                    <BlockItem
                        label={(
                            <FormattedText
                                id='user.settings.display.custom_theme'
                                defaultMessage={'Custom Theme'}
                                style={styles.label}
                            />
                        )}
                        action={setTheme}
                        actionType='select'
                        actionValue={customTheme.type}
                        selected={theme.type?.toLowerCase() === customTheme.type?.toLowerCase()}
                    />
                </Block>
                }
            </View>
        </ScrollView>
    );
};

export default DisplayTheme;
