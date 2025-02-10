// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type Dispatch, type RefObject, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {View} from 'react-native';
import Animated, {type SharedValue, useSharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';

import FormattedText from '@components/formatted_text';
import {ALL_TEAMS_ID} from '@constants/team';
import {useTheme} from '@context/theme';
import TeamPicker from '@screens/home/search/team_picker';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Modifier, {type ModifierItem} from './modifier';
import ShowMoreButton from './show_more';

import type {SearchRef} from '@components/search';
import type TeamModel from '@typings/database/models/servers/team';

const MODIFIER_LABEL_HEIGHT = 48;
const NUM_ITEMS_BEFORE_EXPAND = 4;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        header: {
            alignItems: 'center',
            flexDirection: 'row',
            marginTop: 20,
            marginHorizontal: 18,
        },
        titleContainer: {
            flex: 1,
        },
        title: {
            alignItems: 'center',
            color: theme.centerChannelColor,
            ...typography('Heading', 300, 'SemiBold'),
        },
        teamPickerContainer: {
            flex: 1,
            alignItems: 'flex-end',
        },
    };
});

const getModifiersSectionsData = (intl: IntlShape, teamId: string): ModifierItem[] => {
    const formatMessage = intl.formatMessage;

    const sectionsData = [];
    if (teamId !== ALL_TEAMS_ID) {
        sectionsData.push({
            term: 'From:',
            testID: 'search.modifier.from',
            description: formatMessage({id: 'mobile.search.modifier.from', defaultMessage: ' a specific user'}),
        }, {
            term: 'In:',
            testID: 'search.modifier.in',
            description: formatMessage({id: 'mobile.search.modifier.in', defaultMessage: ' a specific channel'}),
        });
    }

    sectionsData.push({
        term: '-',
        testID: 'search.modifier.exclude',
        description: formatMessage({id: 'mobile.search.modifier.exclude', defaultMessage: ' exclude search terms'}),
    }, {
        term: '""',
        testID: 'search.modifier.phrases',
        description: formatMessage({id: 'mobile.search.modifier.phrases', defaultMessage: ' messages with phrases'}),
        cursorPosition: -1,
    });

    return sectionsData;
};

type Props = {
    scrollEnabled: SharedValue<boolean>;
    searchRef: RefObject<SearchRef>;
    setSearchValue: Dispatch<SetStateAction<string>>;
    searchValue?: string;
    setTeamId: (id: string) => void;
    teamId: string;
    teams: TeamModel[];
    crossTeamSearchEnabled: boolean;
}
const Modifiers = ({scrollEnabled, searchValue, setSearchValue, searchRef, setTeamId, teamId, teams, crossTeamSearchEnabled}: Props) => {
    const theme = useTheme();
    const intl = useIntl();

    const [showMore, setShowMore] = useState(false);
    const height = useSharedValue(NUM_ITEMS_BEFORE_EXPAND * MODIFIER_LABEL_HEIGHT);
    const data = useMemo(() => getModifiersSectionsData(intl, teamId), [intl, teamId]);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>();

    const styles = getStyleFromTheme(theme);
    const animatedStyle = useAnimatedStyle(() => ({
        width: '100%',
        height: withTiming(height.value, {duration: 300}),
        overflow: 'hidden',
    }), []);

    const handleShowMore = useCallback(() => {
        const nextShowMore = !showMore;
        setShowMore(nextShowMore);
        scrollEnabled.value = false;
        height.value = (nextShowMore ? data.length : NUM_ITEMS_BEFORE_EXPAND) * MODIFIER_LABEL_HEIGHT;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setTimeout(() => {
            scrollEnabled.value = true;
        }, 350);
    }, [showMore]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                scrollEnabled.value = true;
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const renderModifier = (item: ModifierItem) => {
        return (
            <Modifier
                key={item.term}
                item={item}
                searchRef={searchRef}
                searchValue={searchValue}
                setSearchValue={setSearchValue}
            />
        );
    };

    return (
        <>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <FormattedText
                        style={styles.title}
                        id={'screen.search.modifier.header'}
                        defaultMessage='Search options'
                        testID='search.modifier.header'
                    />
                </View>

                {teams.length > 1 &&
                <View style={styles.teamPickerContainer}>
                    <TeamPicker
                        setTeamId={setTeamId}
                        teamId={teamId}
                        teams={teams}
                        crossTeamSearchEnabled={crossTeamSearchEnabled}
                    />
                </View>
                }
            </View>
            <Animated.View style={animatedStyle}>
                {data.map((item) => renderModifier(item))}
            </Animated.View>
            {data.length > NUM_ITEMS_BEFORE_EXPAND &&
                <ShowMoreButton
                    onPress={handleShowMore}
                    showMore={showMore}
                />
            }
        </>
    );
};

export default Modifiers;

