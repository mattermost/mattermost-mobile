// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {useTheme} from '@app/context/theme';
import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type EmptyListProps = {
    searchTerm: string;
}

const EmptyList = ({searchTerm}: EmptyListProps) => {
    const theme = useTheme();
    const intl = useIntl();

    const styles = getStyleSheetFromTheme(theme);
    const title = intl.formatMessage(
        {
            id: 'mobile.emoji_picker.search.not_found_title',
            defaultMessage: 'No results found for "{searchTerm}"',
        },
        {
            searchTerm,
        },
    );

    const description = intl.formatMessage({
        id: 'mobile.emoji_picker.search.not_found_description',
        defaultMessage: 'Check the spelling or try another search.',
    });

    return (
        <View style={[styles.flex, styles.flexCenter]}>
            <View style={styles.flexCenter}>
                <View style={styles.notFoundIcon}>
                    <CompassIcon
                        name='magnify'
                        size={72}
                        color={theme.buttonBg}
                    />
                </View>
                <Text style={[styles.notFoundText, styles.notFoundText20]}>
                    {title}
                </Text>
                <Text style={[styles.notFoundText, styles.notFoundText15]}>
                    {description}
                </Text>
            </View>
        </View>
    );
};

const getStyleSheetFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        flexCenter: {
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        },
        notFoundIcon: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            width: 120,
            height: 120,
            borderRadius: 60,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
        notFoundText: {
            color: theme.centerChannelColor,
            marginTop: 16,
        },
        notFoundText20: {
            fontSize: 20,
            fontWeight: '600',
        },
        notFoundText15: {
            fontSize: 15,
        },
    };
});

export default EmptyList;
