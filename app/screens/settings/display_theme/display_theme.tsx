// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ScrollView, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {ThemeTiles} from './theme_tile';

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
    };
});

type DisplayThemeProps = {
    allowedThemeKeys: string[];
}
const DisplayTheme = ({allowedThemeKeys}: DisplayThemeProps) => {
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
