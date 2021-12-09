// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View} from 'react-native';

import {dismissModal} from '@actions/navigation';
import FormattedText from '@components/formatted_text';
import SlideUpPanel from '@components/slide_up_panel';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ParticipantRow from './participant_row';

import type {Theme} from '@mm-redux/types/theme';
import type {UserProfile} from '@mm-redux/types/users';
import type {$ID} from '@mm-redux/types/utilities';

type Props = {
    currentUserId: $ID<UserProfile>;
    userProfiles: UserProfile[];
    teammateNameDisplay: string;
    listTitle?: JSX.Element;
    theme: Theme;
}

const ParticipantsList = ({currentUserId, teammateNameDisplay, theme, userProfiles, listTitle}: Props) => {
    const close = () => {
        dismissModal();
    };

    const renderHeader = () => {
        const style = getStyleSheet(theme);
        if (listTitle) {
            return (
                <View style={style.header}>
                    {listTitle}
                </View>
            );
        }
        return (
            <View style={style.header}>
                <FormattedText
                    id='mobile.participants.header'
                    defaultMessage={'THREAD PARTICIPANTS'}
                    style={style.headerText}
                />
            </View>
        );
    };

    const renderParticipantRows = () => {
        return userProfiles.map((user: UserProfile) => (
            <ParticipantRow
                currentUserId={currentUserId}
                key={user.id}
                teammateNameDisplay={teammateNameDisplay}
                theme={theme}
                user={user}
            />
        ));
    };

    return (
        <View style={{flex: 1}}>
            <SlideUpPanel
                onRequestClose={close}
                initialPosition={0.55}
                header={renderHeader}
                headerHeight={37.5}
                theme={theme}
            >
                {renderParticipantRows()}
            </SlideUpPanel>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        header: {
            backgroundColor: theme.centerChannelBg,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            height: 36.5,
            maxWidth: 450,
            paddingHorizontal: 0,
            width: '100%',
        },
        headerText: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            fontSize: 12,
            fontWeight: '600',
            paddingHorizontal: 16,
            paddingVertical: 0,
            top: 16,
        },
    };
});

export default ParticipantsList;
