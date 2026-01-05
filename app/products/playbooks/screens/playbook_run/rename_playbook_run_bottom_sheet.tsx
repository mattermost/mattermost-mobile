// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {renamePlaybookRun} from '@playbooks/actions/remote/runs';
import {buildNavigationButton, popTopScreen, setButtons} from '@screens/navigation';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    currentTitle: string;
    playbookRunId: string;
}

const SAVE_BUTTON_ID = 'save-playbook-run-name';

const close = (componentId: AvailableScreens): void => {
    Keyboard.dismiss();
    popTopScreen(componentId);
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
});

const RenamePlaybookRunBottomSheet = ({
    componentId,
    currentTitle,
    playbookRunId,
}: Props) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const [title, setTitle] = useState<string>(currentTitle);

    const canSave = useMemo(() => {
        return title.trim().length > 0 && title !== currentTitle;
    }, [title, currentTitle]);

    const rightButton = React.useMemo(() => {
        const base = buildNavigationButton(
            SAVE_BUTTON_ID,
            'playbooks.playbook_run.rename.button',
            undefined,
            formatMessage({id: 'playbooks.playbook_run.rename.button', defaultMessage: 'Save'}),
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

    const handleClose = useCallback(() => {
        close(componentId);
    }, [componentId]);

    const handleSave = useCallback(async () => {
        if (canSave) {
            const res = await renamePlaybookRun(serverUrl, playbookRunId, title.trim());
            if (res.error) {
                showPlaybookErrorSnackbar();
            } else {
                close(componentId);
            }
        }
    }, [canSave, title, componentId, serverUrl, playbookRunId]);

    useNavButtonPressed(SAVE_BUTTON_ID, componentId, handleSave, [handleSave]);
    useAndroidHardwareBackHandler(componentId, handleClose);

    const label = formatMessage({id: 'playbooks.playbook_run.rename.label', defaultMessage: 'Checklist name'});

    return (
        <View
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            style={styles.container}
        >
            <FloatingTextInput
                label={label}
                onChangeText={setTitle}
                testID='playbooks.playbook_run.rename.input'
                value={title}
                theme={theme}
                autoFocus={true}
            />
        </View>
    );
};

export default RenamePlaybookRunBottomSheet;
