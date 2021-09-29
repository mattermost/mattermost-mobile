// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useMemo} from 'react';
import {TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type SectionIconsProps = {
    emojis: RenderableEmojis[];
    currentSectionIndex: number;
    onHandleSectionIconPress: (index: number, isCustomSection: boolean) => void;
}

const SectionIcons = ({emojis, currentSectionIndex, onHandleSectionIconPress}: SectionIconsProps) => {
    const theme = useTheme();
    const {sectionIconContainer, sectionIcon, sectionIconHighlight} = getStyleSheetFromTheme(theme);

    return (
        <>
            {
                emojis.map((section, index: number) => {
                    const onPress = () => onHandleSectionIconPress(index, section.key === 'custom');

                    return (
                        <TouchableOpacity
                            key={section.key}
                            onPress={onPress}
                            style={sectionIconContainer}
                        >
                            <CompassIcon
                                name={section.icon}
                                size={17}
                                style={[
                                    sectionIcon,
                                    index === currentSectionIndex && sectionIconHighlight,
                                ]}
                            />
                        </TouchableOpacity>
                    );
                })
            }
        </>
    );
};

const getStyleSheetFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        sectionIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.3),
        },
        sectionIconContainer: {
            flex: 1,
            height: 35,
            alignItems: 'center',
            justifyContent: 'center',
        },
        sectionIconHighlight: {
            color: theme.centerChannelColor,
        },
    };
});

export default SectionIcons;
