// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View} from 'react-native';
import {UserProfile} from '@mm-redux/types/users';
import type {Theme} from '@mm-redux/types/preferences';
import SlideUpPanel from 'app/components/slide_up_panel';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import FormattedText from 'app/components/formatted_text';
import ParticipantRow from './participant_row';
import {dismissModal} from 'app/actions/navigation';

interface ParticipantsListProps {
    userProfiles: UserProfile[];
    teammateNameDisplay: string,
    theme: Theme;
}

const ParticipantsList = ({userProfiles, teammateNameDisplay, theme}: ParticipantsListProps) => {
    const close = () => {
        dismissModal();
    };

    const renderHeader = () => {
        const style = getStyleSheet(theme);
        return (
            <View style={style.header}>
                <FormattedText
                    id='mobile.participants_header'
                    defaultMessage={'THREAD PARTICIPANTS'}
                    style={style.headerText}
                />
            </View>
        );
    };

    const renderParticipantRows = () => {
        return userProfiles.map((user: UserProfile) => (
            <ParticipantRow
                key={user.id}
                theme={theme}
                user={user}
                teammateNameDisplay={teammateNameDisplay}
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
