// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {type ListRenderItemInfo, useWindowDimensions, View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Participant} from '@calls/screens/participants_list/participant';
import Pill from '@calls/screens/participants_list/pill';
import {sortSessions} from '@calls/utils';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {CallSession} from '@calls/types/calls';

const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 62;
const MIN_ROWS = 5;

type Props = {
    closeButtonId: string;
    sessionsDict: Dictionary<CallSession>;
    teammateNameDisplay: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    header: {
        paddingBottom: 12,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    headerText: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
}));

export const ParticipantsList = ({closeButtonId, sessionsDict, teammateNameDisplay}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const {bottom} = useSafeAreaInsets();
    const {height} = useWindowDimensions();
    const isTablet = useIsTablet();
    const List = useMemo(() => (isTablet ? FlatList : BottomSheetFlatList), [isTablet]);
    const styles = getStyleSheet(theme);

    const sessions = useMemo(() => sortSessions(intl.locale, teammateNameDisplay, sessionsDict), [sessionsDict]);
    const snapPoint1 = bottomSheetSnapPoint(Math.min(sessions.length, MIN_ROWS), ROW_HEIGHT, bottom) + HEADER_HEIGHT;
    const snapPoint2 = height * 0.8;
    const snapPoints = [1, Math.min(snapPoint1, snapPoint2)];
    if (sessions.length > MIN_ROWS && snapPoint1 < snapPoint2) {
        snapPoints.push(snapPoint2);
    }

    const renderItem = useCallback(({item}: ListRenderItemInfo<CallSession>) => (
        <Participant
            key={item.sessionId}
            sess={item}
            teammateNameDisplay={teammateNameDisplay}
        />
    ), [teammateNameDisplay]);

    const renderContent = () => {
        return (
            <>
                <View style={styles.header}>
                    <FormattedText
                        style={styles.headerText}
                        id={'mobile.calls_participants'}
                        defaultMessage={'Participants'}
                    />
                    <Pill text={sessions.length}/>
                </View>
                <List
                    data={sessions}
                    renderItem={renderItem}
                    overScrollMode={'auto'}
                />
                <View style={{height: bottom}}/>
            </>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            componentId={Screens.CALL_PARTICIPANTS}
            snapPoints={snapPoints}
        />
    );
};
