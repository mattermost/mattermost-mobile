// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, ScrollView, Text, useWindowDimensions} from 'react-native';

import {Preferences} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ThemeTile from './theme_tile';

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
        tilesContainer: {
            marginBottom: 30,
            paddingLeft: 8,
            flexDirection: 'row',
            flexWrap: 'wrap',
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});

type DisplayThemeProps = {
    allowedThemeKeys: string[];
}
const DisplayTheme = ({allowedThemeKeys}: DisplayThemeProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();

    const setTheme = () => {
        //todo:
    };

    const renderAllowedThemeTiles = () => {
        return allowedThemeKeys.map((themeKey: string) => (
            <ThemeTile
                key={themeKey}
                label={(
                    <Text>
                        {themeKey}
                    </Text>
                )}
                action={setTheme}
                actionValue={themeKey}
                selected={theme.type?.toLowerCase() === themeKey.toLowerCase()}
                tileTheme={Preferences.THEMES[themeKey]}
                activeTheme={theme}
                isLandscape={dimensions.width > dimensions.height}
                isTablet={isTablet}
            />
        ));
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.wrapper}>
                <View style={styles.tilesContainer}>
                    {renderAllowedThemeTiles()}
                </View>
                {/*{customTheme &&*/}
                {/*    <SafeAreaView*/}
                {/*        edges={['left', 'right']}*/}
                {/*        style={styles.container}*/}
                {/*    >*/}
                {/*        <Section*/}
                {/*            disableHeader={true}*/}
                {/*            theme={theme}*/}
                {/*        >*/}
                {/*            {this.renderCustomThemeRow({item: customTheme})}*/}
                {/*        </Section>*/}
                {/*    </SafeAreaView>*/}
                {/*}*/}
            </View>
        </ScrollView>
    );
};

export default DisplayTheme;
