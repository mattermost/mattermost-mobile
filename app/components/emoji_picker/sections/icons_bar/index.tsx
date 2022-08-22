// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {Device} from '@app/constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SectionIcon from './icon';

export const SCROLLVIEW_NATIVE_ID = 'emojiSelector';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
        borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderTopWidth: 1,
        bottom: 0,
        flexDirection: 'row',
        height: Device.IS_TABLET ? 55 : 43,
        justifyContent: 'space-between',
        width: '100%',
        position: 'absolute',
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
        <View
            nativeID={SCROLLVIEW_NATIVE_ID}
            style={styles.container}
            testID='emoji_picker.emoji_sections.section_bar'
        >
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
    );
};

export default EmojiSectionBar;
