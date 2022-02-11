// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Events, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {showModal} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

import PlusMenuItem from './item';

const PlusMenuList = () => {
    const intl = useIntl();
    const theme = useTheme();

    const browseChannels = useCallback(async () => {
        DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
        await EphemeralStore.waitUntilScreensIsRemoved(Screens.BOTTOM_SHEET);

        const title = intl.formatMessage({id: 'browse_channels.title', defaultMessage: 'More Channels'});
        const closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);

        showModal(Screens.BROWSE_CHANNELS, title, {
            closeButton,
        });
    }, [intl, theme]);

    const createNewChannel = useCallback(async () => {
        // To be added
    }, [intl, theme]);

    const openDirectMessage = useCallback(async () => {
        // To be added
    }, [intl, theme]);

    return (
        <>
            <PlusMenuItem
                pickerAction='browseChannels'
                onPress={browseChannels}
            />
            <PlusMenuItem
                pickerAction='createNewChannel'
                onPress={createNewChannel}
            />
            <PlusMenuItem
                pickerAction='openDirectMessage'
                onPress={openDirectMessage}
            />
        </>
    );
};

export default PlusMenuList;
