// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        display: 'flex',
        flexDirection: 'row',
        paddingLeft: 3,
    },
    badge: {
        backgroundColor: theme.mentionBg,
        position: 'relative',
        left: 0,
    },
    icon: {
        color: changeOpacity(theme.sidebarText, 0.72),
        fontSize: 24,
        lineHeight: 28,
    },
    textContainer: {
        flex: 1,
    },
    text: {
        color: changeOpacity(theme.sidebarText, 0.72),
        paddingLeft: 12,
        ...typography('Body', 200, 'Regular'),
    },
    highlight: {
        color: theme.sidebarText,
        ...typography('Body', 200, 'SemiBold'),
    },
}));

type Props = {
    isCRTEnabled: boolean;
    unreadsAndMentions: {
        unreads: number;
        mentions: number;
    };
};

const ThreadsButton = ({isCRTEnabled, unreadsAndMentions}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(preventDoubleTap(() => {
        goToScreen(Screens.GLOBAL_THREADS, '', {}, {topBar: {visible: false}});
    }), []);

    const {unreads, mentions} = unreadsAndMentions;

    const [iconStyle, textStyle] = useMemo(() => {
        const icon = [styles.icon];
        const text = [styles.text];
        if (unreads) {
            icon.push(styles.highlight);
            text.push(styles.highlight);
        }
        return [icon, text];
    }, [styles, unreads]);

    if (!isCRTEnabled) {
        return null;
    }

    return (
        <TouchableOpacity onPress={handlePress} >
            <View style={styles.container}>
                <CompassIcon
                    name='message-text-outline'
                    style={iconStyle}
                />
                <View style={styles.textContainer}>
                    <FormattedText
                        id='threads'
                        defaultMessage='Threads'
                        style={textStyle}
                    />
                </View>
                <Badge
                    value={mentions}
                    style={styles.badge}
                    visible={mentions > 0}
                />
            </View>
        </TouchableOpacity>
    );
};

export default ThreadsButton;
