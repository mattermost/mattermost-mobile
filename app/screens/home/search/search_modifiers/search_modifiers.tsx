// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useState, useCallback} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {StyleProp, FlatList, ListRenderItem, Platform, NativeSyntheticEvent, NativeScrollEvent, ViewStyle} from 'react-native';
import Animated, {useSharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Modifier, {ModifierItem, MODIFIER_LABEL_HEIGHT} from './modifier';
import ShowMoreButton from './show_more';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const SECTION_HEIGHT = 20;
const RECENT_SEPARATOR_HEIGHT = 3;

//    static propTypes = {
//     actions: PropTypes.shape({
//         clearSearch: PropTypes.func.isRequired,
//         handleSearchDraftChanged: PropTypes.func.isRequired,
//         removeSearchTerms: PropTypes.func.isRequired,
//         searchPostsWithParams: PropTypes.func.isRequired,
//         getMorePostsForSearch: PropTypes.func.isRequired,
//     }).isRequired,
// };

const getModifiersSectionsData = (intl: IntlShape): ModifierItem[] => {
    const formatMessage = intl.formatMessage;
    const sectionsData = [
        {
            value: 'From:',
            testID: 'search.from_section',
            modifier: `${formatMessage({id: 'mobile.search.from_modifier_title', defaultMessage: 'username'})}`,
            description: formatMessage({
                id: 'mobile.search.from_modifier_description',
                defaultMessage: ' a specific user',
            }),
        }, {
            value: 'In:',
            testID: 'search.in_section',
            modifier: `${formatMessage({id: 'mobile.search.in_modifier_title', defaultMessage: 'channel-name'})}`,
            description: formatMessage({
                id: 'mobile.search.in_modifier_description',
                defaultMessage: ' a specific channel',
            }),
        }, {
            value: 'On:',
            testID: 'search.on_section',
            modifier: 'YYYY-MM-DD',
            description: formatMessage({
                id: 'mobile.search.on_modifier_description',
                defaultMessage: ' a specific date',
            }),
        }, {

            // TODO: After is not shown in figma
            value: 'After:',
            testID: 'search.after_section',
            modifier: 'YYYY-MM-DD',
            description: formatMessage({
                id: 'mobile.search.after_modifier_description',
                defaultMessage: ' after a date',
            }),
        }, {
            value: 'Before:',
            testID: 'search.before_section',
            modifier: 'YYYY-MM-DD',
            description: formatMessage({
                id: 'mobile.search.before_modifier_description',
                defaultMessage: ' before a date',
            }),
        }, {
            value: '-',
            testID: 'search.exclude_section',
            modifier: 'YYYY-MM-DD',
            description: formatMessage({
                id: 'mobile.search.exclude_modifier_description',
                defaultMessage: ' exclude search terms',
            }),
        }, {
            value: '""',
            testID: 'search.phrases_section',
            modifier: 'YYYY-MM-DD',
            description: formatMessage({
                id: 'mobile.search.phrases_modifier_description',
                defaultMessage: ' messages with phrases',
            }),
        },
    ];
    return sectionsData;
};

type Props = {
    setSearchValue: (value: string) => void;
    searchValue?: string;
}
const SearchModifiers = ({searchValue, setSearchValue}: Props) => {
    const theme = useTheme();
    const intl = useIntl();

    const [showMore, setShowMore] = useState(false);
    const show = useSharedValue(3 * MODIFIER_LABEL_HEIGHT);

    const styles = getStyleFromTheme(theme);
    const animatedStyle = useAnimatedStyle(() => (
        {
            width: '100%',
            height: withTiming(show.value, {duration: 300}),
        }
    ));

    const renderModifier = (item: ModifierItem) => {
        return (
            <Modifier
                key={item.value}
                item={item}
                setModifierValue={setModifierValue}
            />
        );
    };

    const renderHeader = () => {
        return (
            <FormattedText
                style={styles.title}
                id={'screen.search.modifier.header'}
                defaultMessage='Search options'
            />
        );
    };

    // put in modifier component
    const setModifierValue = preventDoubleTap((modifier) => {
        let newValue = '';

        if (!searchValue) {
            newValue = modifier;
        } else if (searchValue.endsWith(' ')) {
            newValue = `${searchValue}${modifier}`;
        } else {
            newValue = `${searchValue} ${modifier}`;
        }

        setSearchValue(newValue);
    });

    const data = useMemo(() => getModifiersSectionsData(intl), [intl]);

    return (
        <>
            <Animated.View
                style={animatedStyle}
            >
                {data.map((item) => renderModifier(item))}
            </Animated.View>
            <ShowMoreButton
                theme={theme}
                onPress={() => {
                    setShowMore(!showMore);
                    show.value = showMore ? data.length : 3 * MODIFIER_LABEL_HEIGHT;
                }}
                showMore={showMore}
            />
        </>
    );
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        sectionWrapper: {
            marginBottom: 12,
            height: 48,
            backgroundColor: theme.centerChannelBg,
        },
        sectionContainer: {
            justifyContent: 'center',
            paddingLeft: 20,
            height: SECTION_HEIGHT,
        },
        title: {
            paddingVertical: 12,
            paddingHorizontal: 20,
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
        },
        showMore: {
            padding: 20,
            color: theme.buttonBg,
            ...typography('Body', 600, 'SemiBold'),
        },
        separatorContainer: {
            justifyContent: 'center',
            flex: 1,
            height: RECENT_SEPARATOR_HEIGHT,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        sectionList: {
            flex: 1,
        },
    };
});

export default SearchModifiers;

