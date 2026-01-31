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
import {usePreventDoubleTap} from '@hooks/utils';
import SecurityManager from '@managers/security_manager';
import {updatePlaybookRun} from '@playbooks/actions/remote/runs';
import {buildNavigationButton, popTopScreen, setButtons} from '@screens/navigation';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    currentTitle: string;
    currentSummary: string;
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
    summaryInput: {
        marginTop: 16,
    },
});

const RenamePlaybookRunBottomSheet = ({
    componentId,
    currentTitle,
    currentSummary,
    playbookRunId,
}: Props) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const [title, setTitle] = useState<string>(currentTitle);
    const [summary, setSummary] = useState<string>(currentSummary);

    const canSave = useMemo(() => {
        const nameValid = title.trim().length > 0;
        const nameChanged = title !== currentTitle;
        const summaryChanged = summary !== currentSummary;
        return nameValid && (nameChanged || summaryChanged);
    }, [title, currentTitle, summary, currentSummary]);

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
            const res = await updatePlaybookRun(serverUrl, playbookRunId, title.trim(), summary.trim());
            if (res.error) {
                showPlaybookErrorSnackbar();
            } else {
                close(componentId);
            }
        }
    }, [canSave, title, summary, componentId, serverUrl, playbookRunId]);

    const onSave = usePreventDoubleTap(handleSave);

    useNavButtonPressed(SAVE_BUTTON_ID, componentId, onSave, [onSave]);
    useAndroidHardwareBackHandler(componentId, handleClose);

    const nameLabel = formatMessage({id: 'playbooks.playbook_run.rename.label', defaultMessage: 'Checklist name'});
    const summaryLabel = formatMessage({id: 'playbooks.playbook_run.edit.summary_label', defaultMessage: 'Summary'});

    return (
        <View
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            style={styles.container}
        >
            <FloatingTextInput
                label={nameLabel}
                onChangeText={setTitle}
                testID='playbooks.playbook_run.rename.input'
                value={title}
                theme={theme}
                autoFocus={true}
            />
            <View style={styles.summaryInput}>
                <FloatingTextInput
                    label={summaryLabel}
                    onChangeText={setSummary}
                    testID='playbooks.playbook_run.edit.summary_input'
                    value={summary}
                    theme={theme}
                    multiline={true}
                    multilineInputHeight={100}
                />
            </View>
        </View>
    );
};

export default RenamePlaybookRunBottomSheet;
