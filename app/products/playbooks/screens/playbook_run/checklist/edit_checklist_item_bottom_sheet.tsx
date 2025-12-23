// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {buildNavigationButton, popTopScreen, setButtons} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    currentTitle: string;
    currentDescription?: string;
    onSave: (item: ChecklistItemInput) => void;
}

const SAVE_BUTTON_ID = 'save-checklist-item';

const close = (componentId: AvailableScreens): void => {
    Keyboard.dismiss();
    popTopScreen(componentId);
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
    componentId,
    currentTitle,
    currentDescription,
    onSave,
}: Props) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const [title, setTitle] = useState<string>(currentTitle);
    const [description, setDescription] = useState<string>(currentDescription || '');
    const [canSave, setCanSave] = useState(false);

    const rightButton = React.useMemo(() => {
        const base = buildNavigationButton(
            SAVE_BUTTON_ID,
            'playbooks.checklist_item.edit.button',
            undefined,
            formatMessage({id: 'playbooks.checklist_item.edit.button', defaultMessage: 'Save'}),
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
        const titleChanged = title.trim() !== currentTitle.trim();
        const descriptionChanged = (description.trim() || '') !== (currentDescription?.trim() || '');
        setCanSave(title.trim().length > 0 && (titleChanged || descriptionChanged));
    }, [title, description, currentTitle, currentDescription]);

    const handleClose = useCallback(() => {
        close(componentId);
    }, [componentId]);

    const handleSave = useCallback(() => {
        if (title.trim().length > 0) {
            onSave({
                title: title.trim(),
                ...(description.trim() && {description: description.trim()}),
            });
            close(componentId);
        }
    }, [title, description, componentId, onSave]);

    useNavButtonPressed(SAVE_BUTTON_ID, componentId, handleSave, [handleSave]);
    useAndroidHardwareBackHandler(componentId, handleClose);

    const titleLabel = formatMessage({id: 'playbooks.checklist_item.edit.title_label', defaultMessage: 'Task name'});
    const descriptionLabel = formatMessage({id: 'playbooks.checklist_item.edit.description_label', defaultMessage: 'Description'});

    return (
        <View
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            style={styles.container}
        >
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

