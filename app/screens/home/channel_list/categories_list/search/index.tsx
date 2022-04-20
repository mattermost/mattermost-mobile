// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, TouchableHighlight} from 'react-native';
import {Options} from 'react-native-navigation';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Events, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {showModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        width: '100%',
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
        borderRadius: 8,
        padding: 8,
        marginVertical: 20,
        height: 40,
    },
    icon: {
        width: 24,
        fontSize: 24,
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
        const options: Options = {modal: {swipeToDismiss: false}};
        const closeButtonId = 'close-find-channels';
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        options.topBar = {
            leftButtons: [{
                id: closeButtonId,
                icon: closeButton,
                testID: closeButtonId,
            }],
        };

        DeviceEventEmitter.emit(Events.PAUSE_KEYBOARD_TRACKING_VIEW, true);
        showModal(
            Screens.FIND_CHANNELS,
            intl.formatMessage({id: 'find_channels.title', defaultMessage: 'Find Channels'}),
            {closeButtonId},
            options,
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
