// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View, type StyleProp, type TextStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Markdown from '@components/markdown';
import UsersList from '@components/user_avatars_stack/users_list';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {UserModel} from '@database/models/server';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    participantIds: string[];
    users: UserModel[];
    location: AvailableScreens;
    baseTextStyle: StyleProp<TextStyle>;
}

const USER_ROW_HEIGHT = 40;
const MAX_USERS_DISPLAYED = 5;
const BOTTOM_SHEET_MAX_HEIGHT = '80%';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    participantsContainer: {
        flexDirection: 'row',
    },
    icon: {
        marginRight: 5,
    },
    listHeader: {
        marginBottom: 12,
    },
    listHeaderText: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
}));

const Participants = ({baseTextStyle, participantIds, users, location}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const participants = intl.formatMessage({
        id: 'playbooks.status_update_post.participants',
        defaultMessage: '{numParticipants, number} {numParticipants, plural, =1 {participant} other {participants}}',
    }, {numParticipants: participantIds.length});

    const showParticipantsList = usePreventDoubleTap(useCallback(() => {
        const bottomSheetTitle = intl.formatMessage({
            id: 'playbooks.playbook_run.participants_title',
            defaultMessage: 'Run Participants',
        });

        const renderContent = () => (
            <>
                <View style={style.listHeader}>
                    <Text style={style.listHeaderText}>
                        {bottomSheetTitle}
                    </Text>
                </View>
                <UsersList
                    location={location}
                    users={users}
                />
            </>
        );

        const height = bottomSheetSnapPoint(Math.min(users.length, MAX_USERS_DISPLAYED), USER_ROW_HEIGHT) + TITLE_HEIGHT;

        const snapPoints: Array<string | number> = [1, height];
        if (users.length > MAX_USERS_DISPLAYED) {
            snapPoints.push(BOTTOM_SHEET_MAX_HEIGHT);
        }

        bottomSheet(renderContent, snapPoints);
    }, [intl, users, style.listHeader, style.listHeaderText, location]));

    return (
        <TouchableOpacity
            onPress={showParticipantsList}
            style={style.participantsContainer}
        >
            <CompassIcon
                name='account-multiple-outline'
                size={14}
                color={changeOpacity(theme.centerChannelColor, 0.64)}
                style={style.icon}
            />
            <Markdown
                baseTextStyle={baseTextStyle}
                value={participants}
                theme={theme}
                location={location}
            />
        </TouchableOpacity>
    );
};

export default Participants;
