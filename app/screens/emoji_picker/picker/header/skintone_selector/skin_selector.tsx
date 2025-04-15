// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View} from 'react-native';

import {savePreferredSkinTone} from '@actions/remote/preference';
import FormattedText from '@components/formatted_text';
import TouchableEmoji from '@components/touchable_emoji';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {skinCodes} from '@utils/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    onSelectSkin: () => void;
    selected: string;
    skins: Record<string, string>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        width: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selected: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        borderRadius: 4,
    },
    skins: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    textContainer: {
        marginHorizontal: 16,
        maxWidth: 57,
    },
    text: {
        color: theme.centerChannelColor,
        ...typography('Body', 75, 'SemiBold'),
    },
}));

const SkinSelector = ({onSelectSkin, selected, skins}: Props) => {
    const isTablet = useIsTablet();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const handleSelectSkin = useCallback(async (emoji: string) => {
        const skin = emoji.split('hand_')[1] || 'default';
        const code = Object.keys(skinCodes).find((key) => skinCodes[key] === skin) || 'default';
        await savePreferredSkinTone(serverUrl, code);
        onSelectSkin();
    }, [serverUrl]);

    return (
        <>
            <View style={[styles.textContainer, isTablet && {marginLeft: 0}]}>
                <FormattedText
                    id='default_skin_tone'
                    defaultMessage='Default Skin Tone'
                    style={styles.text}
                />
            </View>
            <View style={[styles.skins, isTablet && {marginRight: 10}]}>
                {Object.entries(skins).map(([key, name]) => {
                    return (
                        <View
                            key={name}
                            style={[styles.container, selected === key && styles.selected]}
                        >
                            <TouchableEmoji
                                name={name}
                                size={28}
                                onEmojiPress={handleSelectSkin}
                            />
                        </View>
                    );
                })}
            </View>
        </>
    );
};

export default SkinSelector;
