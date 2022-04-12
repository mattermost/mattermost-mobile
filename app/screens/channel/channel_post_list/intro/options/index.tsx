// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import {Screens} from '@constants';
import {showModal} from '@screens/navigation';

import IntroFavorite from './favorite';
import OptionItem from './item';

type Props = {
    channelId: string;
    header?: boolean;
    favorite?: boolean;
    people?: boolean;
    theme: Theme;
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 8,
        marginTop: 28,
        width: '100%',
    },
});

const IntroOptions = ({channelId, header, favorite, people, theme}: Props) => {
    const {formatMessage} = useIntl();

    const onAddPeople = useCallback(() => {
        const title = formatMessage({id: 'intro.add_people', defaultMessage: 'Add People'});
        showModal(Screens.CHANNEL_ADD_PEOPLE, title, {channelId});
    }, []);

    const onSetHeader = useCallback(() => {
        const title = formatMessage({id: 'screens.channel_edit_header', defaultMessage: 'Edit Channel Header'});
        showModal(Screens.CREATE_OR_EDIT_CHANNEL, title, {channelId, headerOnly: true});
    }, []);

    const onDetails = useCallback(() => {
        const title = formatMessage({id: 'screens.channel_details', defaultMessage: 'Channel Details'});
        showModal(Screens.CHANNEL_DETAILS, title, {channelId});
    }, []);

    return (
        <View style={styles.container}>
            {people &&
            <OptionItem
                applyMargin={true}
                iconName='account-plus-outline'
                label={formatMessage({id: 'intro.add_people', defaultMessage: 'Add People'})}
                onPress={onAddPeople}
                testID='channel_post_list.intro.option_item.add_people'
                theme={theme}
            />
            }
            {header &&
            <OptionItem
                applyMargin={true}
                iconName='pencil-outline'
                label={formatMessage({id: 'intro.set_header', defaultMessage: 'Set Header'})}
                onPress={onSetHeader}
                testID='channel_post_list.intro.option_item.set_header'
                theme={theme}
            />
            }
            {favorite &&
            <IntroFavorite
                channelId={channelId}
                theme={theme}
            />
            }
            <OptionItem
                iconName='information-outline'
                label={formatMessage({id: 'intro.channel_details', defaultMessage: 'Details'})}
                onPress={onDetails}
                testID='channel_post_list.intro.option_item.channel_details'
                theme={theme}
            />
        </View>
    );
};

export default IntroOptions;
