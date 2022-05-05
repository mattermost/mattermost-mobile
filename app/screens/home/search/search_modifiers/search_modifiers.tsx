// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {Text, FlatList, View, Platform, SectionList, SectionListData} from 'react-native';
import Animated from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Modifier, {ModifierItem} from './modifier';
import ShowMoreButton from './show_more';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

const SECTION_HEIGHT = 20;
const RECENT_SEPARATOR_HEIGHT = 3;

const emptySections: Array<SectionListData<ModifierItem | boolean>> = [];

//    static propTypes = {
//     actions: PropTypes.shape({
//         clearSearch: PropTypes.func.isRequired,
//         handleSearchDraftChanged: PropTypes.func.isRequired,
//         removeSearchTerms: PropTypes.func.isRequired,
//         searchPostsWithParams: PropTypes.func.isRequired,
//         getMorePostsForSearch: PropTypes.func.isRequired,
//     }).isRequired,
// };

const getModifiersSectionsData = (intl: IntlShape, showMore: boolean): ModifierItem[] => {
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
        }];

    if (showMore) {
        sectionsData.push(
            {

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
        );
    }
    return sectionsData;
};

const keyModifierExtractor = (item: ModifierItem) => {
    return `modifier-${item.value}`;
};

type Props = {
    handleTextChanged?: any;
    searchValue?: string;
    paddingTop?: any;
}
const SearchModifiers = ({searchValue, handleTextChanged, paddingTop}: Props) => {
    const theme = useTheme();
    const intl = useIntl();

    // const [sections, setSections] = useState<Array<SectionListData<Channel>>>(emptySections);
    const [showMore, setShowMore] = useState(false);

    const styles = getStyleFromTheme(theme);
    const renderModifiers = useCallback(({item}: ModifierItem) => {
        return (
            <Modifier
                item={item}
                setModifierValue={setModifierValue}
            />
        );
    }, []);

    const renderShowMoreItem = useCallback(() => {
        return (
            <ShowMoreButton
                theme={theme}
                onPress={() => {
                    setShowMore(!showMore);
                }}
                showMore={showMore}
            />
        );
    }, [showMore]);

    const renderSectionHeader = ({section}) => {
        const {title} = section;
        if (title) {
            return (
                <Text style={styles.sectionTitle}>
                    {title}
                </Text>
            );
        }
        return <View/>;
    };

    const setModifierValue = preventDoubleTap((modifier) => {
        let newValue = '';

        if (!searchValue) {
            newValue = modifier;
        } else if (searchValue.endsWith(' ')) {
            newValue = `${searchValue}${modifier}`;
        } else {
            newValue = `${searchValue} ${modifier}`;
        }

        handleTextChanged(newValue, true);
    });

    const sectionsData = getModifiersSectionsData(intl, showMore);

    const sections: typeof emptySections = [{
        data: sectionsData,
        key: 'modifiers',
        title: 'Search options',
        renderItem: renderModifiers,
        keyExtractor: keyModifierExtractor,
    }];

    sections.push({
        data: [showMore],
        renderItem: renderShowMoreItem,
    });

    return (
        <AnimatedSectionList

            contentContainerStyle={paddingTop}

            // ref={scrollRef}
            //     style={style.sectionList}
            removeClippedSubviews={true}
            renderSectionHeader={renderSectionHeader}
            sections={sections}
            keyboardShouldPersistTaps='always'
            keyboardDismissMode='interactive'
            stickySectionHeadersEnabled={Platform.OS === 'ios'}

            // onLayout={handleLayout}
            // onScroll={handleScroll}
            scrollEventThrottle={60}

            // SectionSeparatorComponent={renderRecentSeparator}
            //                 onViewableItemsChanged={onViewableItemsChanged}
            testID='search.results_list'
        />
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
        sectionTitle: {
            padding: 20,
            color: theme.centerChannel,
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

