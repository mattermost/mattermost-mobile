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
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';

type Props = {
    currentTitle: string;
    currentDescription?: string;
}

const close = (): void => {
    Keyboard.dismiss();
    CallbackStore.removeCallback();
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

const EditChecklistItemBottomSheet = ({
    currentTitle,
    currentDescription = '',
}: Props) => {
    const navigation = useNavigation();
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const [title, setTitle] = useState<string>(currentTitle);
    const [description, setDescription] = useState<string>(currentDescription);
    const [canSave, setCanSave] = useState(false);

    useEffect(() => {
        const titleChanged = title.trim() !== currentTitle.trim();
        const descriptionChanged = description.trim() !== currentDescription.trim();
        setCanSave(title.trim().length > 0 && (titleChanged || descriptionChanged));
    }, [title, description, currentTitle, currentDescription]);

    const handleSave = useCallback(() => {
        const saveTitle = title.trim();
        if (saveTitle.length > 0) {
            const onSave = CallbackStore.getCallback<(item: ChecklistItemInput) => void>();
            onSave?.({
                title: saveTitle,
                description: description.trim(),
            });
            close();
        }
    }, [title, description]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={handleSave}
                    testID='playbooks.checklist_item.edit.save.button'
                    text={formatMessage({id: 'playbooks.checklist_item.edit.save', defaultMessage: 'Save'})}
                    disabled={!canSave}
                />
            ),
        });
    }, [navigation, handleSave, formatMessage, canSave]);

    useAndroidHardwareBackHandler(Screens.PLAYBOOK_EDIT_CHECKLIST_ITEM, close);

    const titleLabel = formatMessage({id: 'playbooks.checklist_item.edit.title_label', defaultMessage: 'Task name'});
    const descriptionLabel = formatMessage({id: 'playbooks.checklist_item.edit.description_label', defaultMessage: 'Description'});

    return (
        <View style={styles.container}>
            <FloatingTextInput
                label={titleLabel}
                onChangeText={setTitle}
                testID='playbooks.checklist_item.edit.title_input'
                value={title}
                theme={theme}
                autoFocus={true}
            />
            <FloatingTextInput
                label={descriptionLabel}
                onChangeText={setDescription}
                testID='playbooks.checklist_item.edit.description_input'
                value={description}
                theme={theme}
                multiline={true}
                multilineInputHeight={100}
            />
        </View>
    );
};

export default EditChecklistItemBottomSheet;

