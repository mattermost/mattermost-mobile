// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        section: {
            flexDirection: 'row',
        },
        sectionText: {
            ...typography('Body', 75, 'SemiBold'),
            textTransform: 'uppercase',
            color: changeOpacity(theme.centerChannelColor, 0.56),
            paddingTop: 16,
            paddingBottom: 8,
            flex: 1,
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg,
        },
        loading: {paddingTop: 16},
    };
});

type Props = {
    defaultMessage: string;
    id: string;
    loading: boolean;
}

const AutocompleteSectionHeader = ({
    defaultMessage,
    id,
    loading,
}: Props) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const sectionStyles = useMemo(() => {
        return [style.section, {marginLeft: insets.left, marginRight: insets.right}];
    }, [style, insets]);

    return (
        <View style={style.sectionWrapper}>
            <View style={sectionStyles}>
                <FormattedText
                    id={id}
                    defaultMessage={defaultMessage}
                    style={style.sectionText}
                />
                {loading &&
                <ActivityIndicator
                    size='small'
                    style={style.loading}
                    color={changeOpacity(theme.centerChannelColor, 0.56)}
                />
                }
            </View>
        </View>
    );
};

export default AutocompleteSectionHeader;
