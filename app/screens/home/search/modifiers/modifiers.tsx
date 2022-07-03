// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {useWindowDimensions, View} from 'react-native';
import Animated, {useSharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TeamIcon from '@components/team_sidebar/team_list/team_item/team_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import SelectTeamSlideUp from '../select_search_team';

import Modifier, {ModifierItem} from './modifier';
import ShowMoreButton from './show_more';

import type TeamModel from '@typings/database/models/servers/team';

const MODIFIER_LABEL_HEIGHT = 48;
const ITEM_HEIGHT = 72;
const HEADER_HEIGHT = 66;
const CONTAINER_HEIGHT = 392;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        titleContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            marginTop: 20,
        },
        title: {
            flex: 1,
            alignItems: 'center',
            paddingLeft: 20,
            color: theme.centerChannelColor,
            ...typography('Heading', 300, 'SemiBold'),
        },
        teamContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginRight: 20,
        },
        teamIcon: {
            flexDirection: 'row',
            borderRadius: 6,
            height: 48,
            width: 48,
        },
        compass: {
            marginLeft: 4,
            marginBottom: 12,
            alignItems: 'center',
        },
        showMore: {
            padding: 0,
            color: theme.buttonBg,
            ...typography('Body', 200, 'SemiBold'),
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
    teams: TeamModel[];
    setTeamId: (id: string) => void;
    teamId: string;
}
const Modifiers = ({searchValue, setSearchValue, setTeamId, teams, teamId}: Props) => {
    const theme = useTheme();
    const intl = useIntl();

    const [showMore, setShowMore] = useState(false);
    const dimensions = useWindowDimensions();
    const show = useSharedValue(3 * MODIFIER_LABEL_HEIGHT);
    const data = useMemo(() => getModifiersSectionsData(intl), [intl]);
    const isTablet = useIsTablet();

    const maxHeight = Math.round((dimensions.height * 0.9));
    const styles = getStyleFromTheme(theme);
    const animatedStyle = useAnimatedStyle(() => (
        {
            width: '100%',
            height: withTiming(show.value, {duration: 300}),
            overflow: 'hidden',
        }
    ));
    const selectedTeam = teams.find((t) => t.id === teamId);

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

    const handleTeamChange = useCallback(preventDoubleTap(() => {
        const renderContent = () => {
            return (
                <SelectTeamSlideUp
                    setTeamId={setTeamId}
                    otherTeams={teams}
                    teamId={teamId}
                    showTitle={!isTablet && Boolean(teams.length)}
                />
            );
        };

        let height = CONTAINER_HEIGHT;
        if (teams.length) {
            height = Math.min(maxHeight, HEADER_HEIGHT + ((teams.length + 1) * ITEM_HEIGHT));
        }

        bottomSheet({
            closeButtonId: 'close-select-team',
            renderContent,
            snapPoints: [height, 10],
            theme,
            title: intl.formatMessage({id: 'mobile.search.team.select', defaultMessage: 'Select a team to search'}),
        });
    }), [teams, isTablet, theme, teamId]);

    return (
        <>
            <View style={styles.titleContainer}>
                <FormattedText
                    style={styles.title}
                    id={'screen.search.modifier.header'}
                    defaultMessage='Search options'
                />
                {selectedTeam &&
                <TouchableWithFeedback
                    onPress={handleTeamChange}
                    type='opacity'
                    testID={selectedTeam.id}
                >
                    <View style={styles.teamContainer}>
                        <View style={styles.teamIcon}>
                            <TeamIcon
                                displayName={selectedTeam.displayName}
                                id={selectedTeam.id}

                                // lastIconUpdate={selectedTeam.lastTeamIconUpdatedAt}
                                textColor={theme.centerChannelColor}
                                backgroundColor={changeOpacity(theme.centerChannelColor, 0.16)}
                                selected={false}
                                testID={`${selectedTeam}.team_icon`}
                            />
                        </View>
                        <CompassIcon
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                            style={styles.compass}
                            name='menu-down'
                            size={24}
                        />
                    </View>
                </TouchableWithFeedback>
                }
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

