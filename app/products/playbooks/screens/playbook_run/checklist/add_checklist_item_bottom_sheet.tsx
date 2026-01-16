// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
        paddingVertical: 32,
        paddingHorizontal: 20,
        gap: 16,
    },
});

const AddChecklistItemBottomSheet = () => {
    const navigation = useNavigation();
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    const canSave = useMemo(() => {
        return Boolean(title.trim().length);
    }, [title]);

    const handleSave = useCallback(() => {
        if (canSave) {
            const onSave = CallbackStore.getCallback<(item: ChecklistItemInput) => void>();
            onSave?.({
                title: title.trim(),
                ...(description.trim() && {description: description.trim()}),
            });
            close();
        }
    }, [canSave, title, description]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={handleSave}
                    testID='playbooks.checklist_item.add.save.button'
                    text={formatMessage({id: 'playbooks.checklist_item.add.save', defaultMessage: 'Add'})}
                    disabled={!canSave}
                />
            ),
        });
    }, [canSave, formatMessage, handleSave, navigation]);

    useBackNavigation(removeCallback);
    useAndroidHardwareBackHandler(Screens.PLAYBOOK_ADD_CHECKLIST_ITEM, close);

    const titleLabel = formatMessage({id: 'playbooks.checklist_item.add.label', defaultMessage: 'Task name'});
    const descriptionLabel = formatMessage({id: 'playbooks.checklist_item.add.description_label', defaultMessage: 'Description'});

    return (
        <View style={styles.container}>
            <FloatingTextInput
                label={titleLabel}
                onChangeText={setTitle}
                testID='playbooks.checklist_item.add.input'
                value={title}
                theme={theme}
                autoFocus={true}
            />
            <FloatingTextInput
                label={descriptionLabel}
                onChangeText={setDescription}
                testID='playbooks.checklist_item.add.description_input'
                value={description}
                theme={theme}
                multiline={true}
                multilineInputHeight={100}
            />
        </View>
    );
};

export default AddChecklistItemBottomSheet;
