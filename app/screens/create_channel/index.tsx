// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    InteractionManager,
    Keyboard,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {handleCreateChannel} from '@actions/remote/channel';
import EditChannelInfo from '@components/edit_channel_info';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {popTopScreen, dismissModal, setButtons} from '@screens/navigation';

type Props = {
        serverUrl: string;
        componentId: string;
        categoryId: string;
        channelType: ChannelType;
        closeButton: object;
}

const CLOSE_NEW_CHANNEL_ID = 'close-new-channel';
const CREATE_CHANNEL_ID = 'create-channel';

const CreateChannel = ({serverUrl, componentId, channelType, closeButton}: Props) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const [error, setError] = useState<string>('');
    const [creating, setCreating] = useState<boolean>(false);
    const [displayName, setDisplayName] = useState<string>('');
    const [purpose, setPurpose] = useState<string>('');
    const [header, setHeader] = useState<string>('');
    const [type, setType] = useState<ChannelType>(channelType || General.OPEN_CHANNEL);

    const leftButton = {
        id: CLOSE_NEW_CHANNEL_ID,
        icon: closeButton,
    };

    const rightButton = {
        testID: 'create_channel.create.button',
        id: CREATE_CHANNEL_ID,
        enabled: false,
        showAsAction: 'always',
        color: theme.sidebarHeaderTextColor,
        text: formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
    };

    const emitCanSaveChannel = (enabled: boolean) => {
        const rightButtons = [{...rightButton, enabled}] as never[];
        let leftButtons: never[] = [];

        if (closeButton) {
            leftButtons = [leftButton] as never[];
        }

        setButtons(componentId, {
            leftButtons,
            rightButtons,
        });
    };

    useEffect(() => {
        const rightButtons = [{...rightButton, enabled: false}] as never[];
        const leftButtons: never[] = [];
        setButtons(componentId, {
            leftButtons,
            rightButtons,
        });
    }, []);

    const onRequestStart = () => {
        setError('');
        setCreating(true);
    };

    const onRequestFailure = (errorText: string) => {
        setError(errorText);
        setCreating(false);
    };

    const emitCreating = (loading: boolean) => {
        const rightButtons = [{...rightButton, enabled: !loading}] as never[];
        const leftButtons: never[] = [];

        // if (this.left) {
        //     buttons.leftButtons = [this.left];
        // }
        //
        setButtons(componentId, {
            leftButtons,
            rightButtons,
        });
    };

    const onCreateChannel = async () => {
        emitCreating(true);
        onRequestStart();

        Keyboard.dismiss();

        const channel = await handleCreateChannel(serverUrl, displayName, purpose, header, type);
        if (channel.error) {
            emitCreating(false);
            onRequestFailure(channel.error as string);
            return;
        }

        // DeviceEventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
        InteractionManager.runAfterInteractions(() => {
            emitCreating(false);
            setError('');
            setCreating(false);
            close(false);
        });
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
                    case CLOSE_NEW_CHANNEL_ID:
                        close(!closeButton);
                        break;
                    case CREATE_CHANNEL_ID:
                        onCreateChannel();
                        break;
                }
            },
        }, componentId);

        return () => {
            create.remove();
        };
    }, [displayName, header, purpose, type]);

    const onDisplayNameChange = (displayNameText: string) => {
        setDisplayName(displayNameText);
    };

    const onPurposeChange = (purposeText: string) => {
        setPurpose(purposeText);
    };

    const onHeaderChange = (headerText: string) => {
        setHeader(headerText);
    };

    const onTypeChange = (typeText: ChannelType) => {
        setType(typeText);
    };

    return (
        <EditChannelInfo
            testID='create_channel.screen'
            enableRightButton={emitCanSaveChannel}
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
};

export default CreateChannel;
