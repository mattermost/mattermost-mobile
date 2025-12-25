// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';

import {Screens} from '@constants';
import {useIsTablet, useWindowDimensions} from '@hooks/device';
import BottomSheet, {BUTTON_HEIGHT, TITLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheetSnapPoint} from '@utils/helpers';

import AddServerButton from './add_server_button';
import ServerListContent, {type ServersListContentProps} from './servers_list_content';

import type ServersModel from '@typings/database/models/app/servers';

export const SERVER_ITEM_HEIGHT = 75;
export const PUSH_ALERT_TEXT_HEIGHT = 42;

const ServersList = ({servers}: ServersListContentProps) => {
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();
    const maxScreenHeight = Math.ceil(0.6 * dimensions.height);
    const maxSnapPoint = Math.min(
        maxScreenHeight,
        bottomSheetSnapPoint(servers.length, SERVER_ITEM_HEIGHT) + TITLE_HEIGHT + BUTTON_HEIGHT +
                        (servers.filter((s: ServersModel) => s.lastActiveAt).length * PUSH_ALERT_TEXT_HEIGHT),
    );

    const snapPoints: Array<string | number> = [
        1,
        maxSnapPoint,
    ];
    if (maxSnapPoint === maxScreenHeight) {
        snapPoints.push('80%');
    }

    const renderContent = useCallback(() => <ServerListContent servers={servers}/>, [servers]);

    return (
        <BottomSheet
            screen={Screens.SERVERS_LIST}
            renderContent={renderContent}
            snapPoints={snapPoints}
            footerComponent={isTablet ? undefined : AddServerButton}
        />
    );
};

export default ServersList;
