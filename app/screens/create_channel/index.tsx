// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import {DeviceEventEmitter} from 'react-native';
import {useIntl} from 'react-intl';
import React, {useEffect, useState} from 'react';
import {useTheme} from '@context/theme';
import {
    Keyboard,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {popTopScreen, dismissModal, setButtons} from '@screens/navigation';
import EditChannelInfo from '@components/edit_channel_info';
import {handleCreateChannel} from '@actions/remote/channel'

type Props = {
        componentId: string,
        categoryId: string,
        channelType: ChannelType,
        closeButton: object,
        // createChannelRequest: object,
}

const CreateChannel = ({actions, componentId, categoryId, channelType, closeButton, createChannelRequest}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const [error, setError] = useState<string>('');
    const [creating, setCreating] = useState<boolean>(false);
    const [displayName, setDisplayName] = useState<string>('');
    const [purpose, setPurpose] = useState<string>('');
    const [header, setHeader] = useState<string>('');
    const [type, setType] = useState<ChannelType>(channelType || General.OPEN_CHANNEL);

    const leftButton = {
        id: 'close-new-channel',
        icon: closeButton,
    };

    const rightButton = {
        testID: 'create_channel.create.button',
        id: 'create-channel',
        enabled: false,
        showAsAction: 'always',
        text: intl.formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
        color: theme.sidebarHeaderTextColor,
    };

    const emitCanCreateChannel = (enabled: boolean) => {
        const rightButtons = [{...rightButton, enabled}] as never[]
        let leftButtons: never[] = []

        if (closeButton) {
            leftButtons = [leftButton] as never[];
        }

        setButtons(componentId, {
            leftButtons, 
            rightButtons
        });
    };

    useEffect(() => {
        emitCanCreateChannel(false);
    }, []);

    const onRequestStart = ()  => {
        setError('')
        setCreating(true)
    }

    const onRequestFailure = (error: string) => {
        setError(error);
        setCreating(false);
    }

    const emitCreating = (loading: boolean) => {
        const buttons = {
            rightButtons: [{...rightButton, enabled: !loading}],
        };

        // if (this.left) {
        //     buttons.leftButtons = [this.left];
        // }
        //
        // setButtons(componentId, buttons);
    };

    // componentDidUpdate(prevProps) {
    //     if (createChannelRequest !== prevProps.createChannelRequest) {
    //         switch (createChannelRequest.status) {
    //             case RequestStatus.STARTED:
    //                 emitCreating(true);
    //                 onRequestStart();
    //                 break;
    //             case RequestStatus.SUCCESS:
    //                 DeviceEventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
    //                 InteractionManager.runAfterInteractions(() => {
    //                     emitCreating(false);
    //                     setError('');
    //                     setCreating(false);
    //                     close(false);
    //                 });
    //                 break;
    //             case RequestStatus.FAILURE:
    //                 emitCreating(false);
    //                 onRequestFailure(createChannelRequest.error);
    //                 break;
    //         }
    //     }
    // }

    const onCreateChannel = () => {
        Keyboard.dismiss();
        actions.handleCreateChannel(displayName, purpose, header, type, categoryId);
    };

    const close = (goBack = false) => {
        Keyboard.dismiss();
        if (goBack) {
            popTopScreen();
        } else {
            dismissModal();
        }
    };

    useEffect(() => {
        const create = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                switch (buttonId) {
                    case 'close-new-channel':
                        close(!closeButton);
                        break;
                    case 'create-channel':
                        onCreateChannel();
                        break;
                }
            },
        }, componentId);

        return () => {
            create.remove();
        }

    }, [type, displayName, header, purpose]);

    const onDisplayNameChange = (displayName: string) => {
        setDisplayName(displayName);
    };

    const onPurposeChange = (purpose: string) => {
        setPurpose(purpose);
    };

    const onHeaderChange = (header: string) => {
        setHeader(header);
    };

    const onTypeChange = (type: ChannelType) => {
        setType(type);
    }

    return (
        <EditChannelInfo
            testID='create_channel.screen'
            enableRightButton={emitCanCreateChannel}
            error={error}
            saving={creating}
            onDisplayNameChange={onDisplayNameChange}
            onPurposeChange={onPurposeChange}
            onHeaderChange={onHeaderChange}
            onTypeChange={onTypeChange}
            displayName={displayName}
            purpose={purpose}
            header={header}
            type={type}
        />
    );
}

export default CreateChannel
