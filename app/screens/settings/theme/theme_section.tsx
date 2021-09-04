// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {FC, useMemo} from 'react';
import {Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {Theme} from '@mm-redux/types/theme';
import Section from '@screens/settings/section';
import SectionItem from '@screens/settings/section_item';
import ThemeTile from '@screens/settings/theme/theme_tile';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {CUSTOM_THEME_KEY} from './theme';

const ThemeSection: FC<Props> = ({
    headerId,
    headerDefaultMessage,
    allowedThemes,
    theme,
    activeThemeType,
    onSelect,
    customThemeAvailable,
    isLandscape,
    isTablet,
    allowCustomThemes,
    testID,
}: Props) => {
    const style = useMemo(() => getStyleSheet(theme), [theme]);

    return (
        <Section
            headerId={headerId}
            headerDefaultMessage={headerDefaultMessage}
            headerStyle={{textTransform: 'uppercase'}}
            theme={theme}
        >
            <View style={style.tilesContainer}>
                {allowedThemes.map((allowedTheme) => (
                    <ThemeTile
                        testID={`${testID}.${allowedTheme.key}`}
                        key={allowedTheme.key}
                        action={onSelect}
                        actionValue={allowedTheme.key}
                        label={<Text>{allowedTheme.type}</Text>}
                        isLandscape={isLandscape}
                        activeTheme={theme}
                        tileTheme={allowedTheme}
                        isTablet={isTablet}
                        selected={allowedTheme.type?.toLowerCase() === activeThemeType?.toLowerCase()}
                    />
                ))}
            </View>
            {allowCustomThemes && customThemeAvailable && (
                <SectionItem
                    testID={`${testID}.custom_theme_item`}
                    label={(
                        <FormattedText
                            id='user.settings.display.custom_theme'
                            defaultMessage='Custom Theme'
                        />
                    )}
                    action={onSelect}
                    theme={theme}
                    actionType='select'
                    actionValue={CUSTOM_THEME_KEY}
                    selected={activeThemeType?.toLowerCase() === CUSTOM_THEME_KEY}
                />
            )}
        </Section>
    );
};

type Props = {
    activeThemeType?: string;
    allowedThemes: AllowedTheme[];
    headerId: string;
    headerDefaultMessage: string;
    theme: Theme;
    onSelect: (themeKey: string) => void;
    customThemeAvailable: boolean;
    isLandscape: boolean;
    isTablet: boolean;
    allowCustomThemes: boolean;
    testID: string;
};

export type AllowedTheme = Theme & {key: string};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    tilesContainer: {
        paddingLeft: 8,
        paddingRight: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: theme.centerChannelBg,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
    },
}));

export default ThemeSection;
