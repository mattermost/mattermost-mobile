// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';

import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {buildNavigationButton, popTopScreen, setButtons} from '@screens/navigation';

import EditCommandForm from './edit_command_form';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    savedCommand?: string;
    updateCommand: (command: string) => void;
    channelId: string;
}

const SAVE_BUTTON_ID = 'save-command';

const close = (componentId: AvailableScreens): void => {
    Keyboard.dismiss();
    popTopScreen(componentId);
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

const CreateOrEditChannel = ({
    componentId,
    savedCommand,
    updateCommand,
    channelId,
}: Props) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const [canSave, setCanSave] = useState(false);
    const [command, setCommand] = useState<string>(savedCommand || '/');

    const rightButton = useMemo(() => {
        const base = buildNavigationButton(
            SAVE_BUTTON_ID,
            'playbooks.edit_command.save.button',
            undefined,
            formatMessage({id: 'playbooks.edit_command.save.button', defaultMessage: 'Save'}),
        );
        base.enabled = canSave;
        base.color = theme.sidebarHeaderTextColor;
        return base;
    }, [formatMessage, canSave, theme.sidebarHeaderTextColor]);

    useEffect(() => {
        setButtons(componentId, {
            rightButtons: [rightButton],
        });
    }, [rightButton, componentId]);

    useEffect(() => {
        setCanSave(command !== savedCommand);
    }, [command, savedCommand]);

    const handleClose = useCallback(() => {
        close(componentId);
    }, [componentId]);

    const onEditCommand = useCallback(() => {
        close(componentId);
        updateCommand(command);
    }, [command, componentId, updateCommand]);

    useNavButtonPressed(SAVE_BUTTON_ID, componentId, onEditCommand, [onEditCommand]);
    useAndroidHardwareBackHandler(componentId, handleClose);

    return (
        <View
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            style={styles.container}
        >
            <EditCommandForm
                command={command}
                onCommandChange={setCommand}
                channelId={channelId}
            />
        </View>
    );
};

export default CreateOrEditChannel;
