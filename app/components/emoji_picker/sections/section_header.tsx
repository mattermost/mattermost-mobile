// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {View} from 'react-native';

import {CategoryMessage, CategoryTranslations} from '@app/utils/emoji';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {SECTION_HEADER_HEIGHT} from '../constant';

import type {EmojiCategoryType} from '@app/store/emoji_picker/interface';

type Props = {
    section?: EmojiCategoryType;
}

const getStyleSheetFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        sectionTitleContainer: {
            height: SECTION_HEADER_HEIGHT,
            justifyContent: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        sectionTitle: {
            color: changeOpacity(theme.centerChannelColor, 0.2),
            textTransform: 'uppercase',
            ...typography('Heading', 75, 'SemiBold'),
        },
    };
});

const SectionHeader = ({section}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheetFromTheme(theme);

    if (!section?.key) {
        return null;
    }

    return (
        <View
            style={styles.sectionTitleContainer}
            key={section.key}
        >
            <FormattedText
                style={styles.sectionTitle}
                id={CategoryTranslations.get(section.key)!}
                defaultMessage={CategoryMessage.get(section.key)}
            />
        </View>
    );
};

export default memo(SectionHeader);
