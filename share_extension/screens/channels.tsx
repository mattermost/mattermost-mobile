// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import SearchBar from '@components/search';
import DatabaseManager from '@database/manager';
import RecentChannels from '@share/components/recent_channels';
import SearchChannels from '@share/components/search_channels';
import {useShareExtensionServerUrl} from '@share/state';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    theme: Theme;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        marginHorizontal: 20,
        marginTop: 20,
    },
    inputContainerStyle: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.12),
    },
    inputStyle: {
        color: theme.centerChannelColor,
    },
    listContainer: {
        flex: 1,
        marginTop: 8,
    },
}));

const Channels = ({theme}: Props) => {
    const serverUrl = useShareExtensionServerUrl();
    const styles = getStyles(theme);
    const [term, setTerm] = useState('');
    const color = useMemo(() => changeOpacity(theme.centerChannelColor, 0.72), [theme]);
    const navigator = useNavigation();
    const intl = useIntl();

    useEffect(() => {
        navigator.setOptions({
            title: intl.formatMessage({id: 'share_extension.channels_screen.title', defaultMessage: 'Select channel'}),
        });
    }, [intl.locale]);

    const cancelButtonProps = useMemo(() => ({
        color,
        buttonTextStyle: {
            ...typography('Body', 100),
        },
    }), [color]);

    const database = useMemo(() => {
        try {
            const server = DatabaseManager.getServerDatabaseAndOperator(serverUrl || '');
            return server.database;
        } catch {
            return undefined;
        }
    }, [serverUrl]);

    if (!database) {
        return null;
    }

    return (
        <View style={styles.container}>
            <SearchBar
                autoCapitalize='none'
                autoFocus={true}
                cancelButtonProps={cancelButtonProps}
                clearIconColor={color}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                onChangeText={setTerm}
                placeholderTextColor={color}
                searchIconColor={color}
                selectionColor={color}
                value={term}
            />
            {term === '' &&
            <RecentChannels
                database={database}
                theme={theme}
            />
            }
            {Boolean(term) &&
            <SearchChannels
                database={database}
                term={term}
                theme={theme}
            />
            }
        </View>
    );
};

export default Channels;
