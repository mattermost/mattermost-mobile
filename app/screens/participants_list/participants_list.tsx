// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {FlatList, View} from 'react-native';
import {UserProfile} from '@mm-redux/types/users';
import type {Theme} from '@mm-redux/types/preferences';
import SlideUpPanel from 'app/components/slide_up_panel';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import FormattedText from 'app/components/formatted_text';
import ParticipantRow from './participant_row';
import {dismissModal} from 'app/actions/navigation';

interface ParticipantsListProps {
    userProfiles: UserProfile[];
    theme: Theme;
}

type ListItem = (info: {item: UserProfile}) => React.ReactElement;

const ParticipantsList = ({userProfiles, theme}: ParticipantsListProps) => {
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

    const renderItem: ListItem = ({item}) => (
        <ParticipantRow
            key={item.id}
            theme={theme}
            user={item}
        />
    );

    const keyExtractor = (user: UserProfile) => user.id;

    const renderParticipantRows = () => {
        return (
            <FlatList
                testID='share_extension.team_list.screen'
                data={userProfiles}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
            />);
    };

    return (
        <View style={{flex: 1}}>
            <SlideUpPanel
                onRequestClose={close}
                initialPosition={0.55}
                header={renderHeader}
                headerHeight={37.5}
                theme={theme}
                skipAnimatedDrag={true}
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
