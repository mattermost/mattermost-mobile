// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';

import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {useIsTablet} from '@hooks/device';
import {usePropsFromParams} from '@hooks/props_from_params';
import BottomSheet from '@screens/bottom_sheet';
import TeamOptions, {type TeamOptionsProps} from '@screens/team_options';
import {SEPARATOR_HEIGHT} from '@screens/team_options/separator';
import {bottomSheetSnapPoint} from '@utils/helpers';

export default function ServersListRoute() {
    const navigation = useNavigation();
    const {canCreateChannels, canJoinChannels, canInvitePeople} = usePropsFromParams<TeamOptionsProps>();
    const isTablet = useIsTablet();
    const intl = useIntl();

    let items = 1;
    let separators = 0;

    if (canCreateChannels) {
        items += 1;
    }

    if (canJoinChannels) {
        items += 1;
    }

    if (canInvitePeople) {
        items += 1;
        separators += 1;
    }

    const snapPoints = [1, bottomSheetSnapPoint(items, ITEM_HEIGHT) + (separators * SEPARATOR_HEIGHT)];

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            headerOptions: {
                headerTitle: intl.formatMessage({id: 'home.header.plus_menu', defaultMessage: 'Options'}),
                headerShown: isTablet,
            },
        });
    }, [intl, isTablet, navigation]);

    const renderContent = useCallback(() => (
        <TeamOptions
            canCreateChannels={canCreateChannels}
            canJoinChannels={canJoinChannels}
            canInvitePeople={canInvitePeople}
        />), [canCreateChannels, canJoinChannels, canInvitePeople]);

    return (
        <BottomSheet
            screen={Screens.TEAM_OPTIONS}
            renderContent={renderContent}
            snapPoints={snapPoints}
        />
    );
}
