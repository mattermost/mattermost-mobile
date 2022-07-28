// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {View} from 'react-native';
import Animated, {useSharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import TeamPickerIcon from '@screens/home/search/team_picker_icon';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Modifier, {ModifierItem} from './modifier';
import ShowMoreButton from './show_more';

const MODIFIER_LABEL_HEIGHT = 48;
const TEAM_PICKER_ICON_SIZE = 32;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        titleContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            marginTop: 20,
            marginRight: 18,
        },
        title: {
            flex: 1,
            alignItems: 'center',
            paddingLeft: 18,
            color: theme.centerChannelColor,
            ...typography('Heading', 300, 'SemiBold'),
        },
    };
});

const getModifiersSectionsData = (intl: IntlShape): ModifierItem[] => {
    const formatMessage = intl.formatMessage;
    const sectionsData = [
        {
            term: 'From:',
            testID: 'search.from_section',
            description: formatMessage({id: 'mobile.search.modifier.from', defaultMessage: ' a specific user'}),
        }, {
            term: 'In:',
            testID: 'search.in_section',
            description: formatMessage({id: 'mobile.search.modifier.in', defaultMessage: ' a specific channel'}),
        }, {
            term: 'On:',
            testID: 'search.on_section',
            description: formatMessage({id: 'mobile.search.modifier.on', defaultMessage: ' a specific date'}),
        }, {
            term: 'After:',
            testID: 'search.after_section',
            description: formatMessage({id: 'mobile.search.modifier.after', defaultMessage: ' after a date'}),
        }, {
            term: 'Before:',
            testID: 'search.before_section',
            description: formatMessage({id: 'mobile.search.modifier.before', defaultMessage: ' before a date'}),
        }, {
            term: '-',
            testID: 'search.exclude_section',
            description: formatMessage({id: 'mobile.search.modifier.exclude', defaultMessage: ' exclude search terms'}),
        }, {
            term: '""',
            testID: 'search.phrases_section',
            description: formatMessage({id: 'mobile.search.modifier.phrases', defaultMessage: ' messages with phrases'}),
        },
    ];
    return sectionsData;
};

type Props = {
    setSearchValue: (value: string) => void;
    searchValue?: string;
    setTeamId: (id: string) => void;
    teamId: string;
}
const Modifiers = ({searchValue, setSearchValue, setTeamId, teamId}: Props) => {
    const theme = useTheme();
    const intl = useIntl();

    const [showMore, setShowMore] = useState(false);
    const show = useSharedValue(3 * MODIFIER_LABEL_HEIGHT);
    const data = useMemo(() => getModifiersSectionsData(intl), [intl]);

    const styles = getStyleFromTheme(theme);
    const animatedStyle = useAnimatedStyle(() => (
        {
            width: '100%',
            height: withTiming(show.value, {duration: 300}),
            overflow: 'hidden',
        }
    ));

    const handleShowMore = useCallback(() => {
        const nextShowMore = !showMore;
        setShowMore(nextShowMore);
        show.value = (nextShowMore ? data.length : 3) * MODIFIER_LABEL_HEIGHT;
    }, [showMore]);

    const renderModifier = (item: ModifierItem) => {
        return (
            <Modifier
                key={item.term}
                item={item}
                searchValue={searchValue}
                setSearchValue={setSearchValue}
            />
        );
    };

    return (
        <>
            <View style={styles.titleContainer}>
                <FormattedText
                    style={styles.title}
                    id={'screen.search.modifier.header'}
                    defaultMessage='Search options'
                />
                <TeamPickerIcon
                    size={TEAM_PICKER_ICON_SIZE}
                    setTeamId={setTeamId}
                    teamId={teamId}
                />
            </View>
            <Animated.View style={animatedStyle}>
                {data.map((item) => renderModifier(item))}
            </Animated.View>
            <ShowMoreButton
                onPress={handleShowMore}
                showMore={showMore}
            />
        </>
    );
};

export default Modifiers;

