// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SectionIcon from './icon';

export const SCROLLVIEW_NATIVE_ID = 'emojiSelector';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        bottom: 10,
        height: 35,
        position: 'absolute',
        width: '100%',
    },
    background: {
        backgroundColor: theme.centerChannelBg,
    },
    pane: {
        flexDirection: 'row',
        borderRadius: 10,
        paddingHorizontal: 10,
        width: '100%',
        borderColor: changeOpacity(theme.centerChannelColor, 0.3),
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        borderWidth: 1,
        justifyContent: 'space-between',
    },
}));

export type SectionIconType = {
    key: string;
    icon: string;
}

type Props = {
    currentIndex: number;
    sections: SectionIconType[];
    scrollToIndex: (index: number) => void;
}

const EmojiSectionBar = ({currentIndex, sections, scrollToIndex}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    return (
        <KeyboardTrackingView
            scrollViewNativeID={SCROLLVIEW_NATIVE_ID}
            normalList={true}
            style={styles.container}
        >
            <View style={styles.background}>
                <View style={styles.pane}>
                    {sections.map((section, index) => (
                        <SectionIcon
                            currentIndex={currentIndex}
                            key={section.key}
                            icon={section.icon}
                            index={index}
                            scrollToIndex={scrollToIndex}
                            theme={theme}
                        />
                    ))}
                </View>
            </View>
        </KeyboardTrackingView>
    );
};

export default EmojiSectionBar;
