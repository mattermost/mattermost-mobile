// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';

type Props = {
    currentTitle: string;
}

const removeCallbacks = () => {
    CallbackStore.removeCallback();
};

const close = (): void => {
    Keyboard.dismiss();
    removeCallbacks();
    navigateBack();
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
});

const RenameChecklistBottomSheet = ({currentTitle}: Props) => {
    const navigation = useNavigation();
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const [title, setTitle] = useState<string>(currentTitle);
    const [canSave, setCanSave] = useState(false);

    useEffect(() => {
        setCanSave(title.trim().length > 0 && title !== currentTitle);
    }, [title, currentTitle]);

    const handleSave = useCallback(() => {
        if (title.trim().length > 0) {
            const onSave = CallbackStore.getCallback<((newTitle: string) => void)>();
            onSave?.(title.trim());
            close();
        }
    }, [title]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={handleSave}
                    testID='playbooks.checklist.rename.button'
                    text={formatMessage({id: 'playbooks.checklist.rename.button', defaultMessage: 'Save'})}
                    disabled={!canSave}
                />
            ),
        });
    }, [navigation, handleSave, formatMessage, canSave]);

    useBackNavigation(removeCallbacks);
    useAndroidHardwareBackHandler(Screens.PLAYBOOK_RENAME_CHECKLIST, close);

    const label = formatMessage({id: 'playbooks.checklist.rename.label', defaultMessage: 'Section name'});

    return (
        <View style={styles.container}>
            <FloatingTextInput
                label={label}
                onChangeText={setTitle}
                testID='playbooks.checklist.rename.input'
                value={title}
                theme={theme}
                autoFocus={true}
            />
        </View>
    );
};

export default RenameChecklistBottomSheet;
