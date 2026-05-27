// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';

import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';

import EditCommandForm from './edit_command_form';

type Props = {
    savedCommand?: string;
    channelId: string;
}

const removeCallback = () => {
    CallbackStore.removeCallback();
};

const close = (): void => {
    Keyboard.dismiss();
    removeCallback();
    navigateBack();
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

const CreateOrEditChannel = ({
    savedCommand,
    channelId,
}: Props) => {
    const navigation = useNavigation();
    const intl = useIntl();

    const [canSave, setCanSave] = useState(false);
    const [command, setCommand] = useState<string>(savedCommand || '/');

    useEffect(() => {
        setCanSave(command !== savedCommand);
    }, [command, savedCommand]);

    const onEditCommand = useCallback(() => {
        const updateCommand = CallbackStore.getCallback<((command: string) => void)>();
        updateCommand?.(command);
        close();
    }, [command]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={onEditCommand}
                    testID='playbooks.edit_command.save.button'
                    text={intl.formatMessage({id: 'playbooks.edit_command.save.button', defaultMessage: 'Save'})}
                    disabled={!canSave}
                />
            ),
        });
    }, [navigation, onEditCommand, intl, canSave]);

    useBackNavigation(removeCallback);
    useAndroidHardwareBackHandler(Screens.PLAYBOOK_EDIT_COMMAND, close);

    return (
        <View style={styles.container}>
            <EditCommandForm
                command={command}
                onCommandChange={setCommand}
                channelId={channelId}
            />
        </View>
    );
};

export default CreateOrEditChannel;
