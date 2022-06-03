// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {PixelRatio, TouchableHighlight} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {findChannels} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        flex: 1,
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
        borderRadius: 8,
        padding: 8,
        marginVertical: 20,
    },
    icon: {
        color: changeOpacity(theme.sidebarText, 0.72),
    },
    input: {
        color: changeOpacity(theme.sidebarText, 0.72),
        marginLeft: 5,
        marginTop: 1,
        ...typography('Body', 200),
    },
}));

const SearchField = () => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const onPress = useCallback(() => {
        findChannels(
            intl.formatMessage({id: 'find_channels.title', defaultMessage: 'Find Channels'}),
            theme,
        );
    }, [intl.locale, theme]);

    return (
        <TouchableHighlight
            style={styles.container}
            onPress={onPress}
            underlayColor={changeOpacity(theme.sidebarText, 0.32)}
        >
            <>
                <CompassIcon
                    name='magnify'
                    size={24 * PixelRatio.getFontScale()}
                    style={styles.icon}
                />
                <FormattedText
                    defaultMessage='Find channels...'
                    id='channel_list.find_channels'
                    style={styles.input}
                />
            </>
        </TouchableHighlight>
    );
};

export default SearchField;
