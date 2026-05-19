// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {updatePlaybookRun} from '@playbooks/actions/remote/runs';
import {navigateBack} from '@screens/navigation';
import {dismissKeyboard} from '@utils/keyboard';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';

export type Props = {
    currentTitle: string;
    currentSummary: string;
    playbookRunId: string;
    canEditSummary: boolean;
}

const close = (): void => {
    dismissKeyboard();
    navigateBack();
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        gap: 16,
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
});

const RenamePlaybookRunBottomSheet = ({
    currentTitle,
    currentSummary,
    playbookRunId,
    canEditSummary,
}: Props) => {
    const navigation = useNavigation();
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const [title, setTitle] = useState<string>(currentTitle);
    const [summary, setSummary] = useState<string>(currentSummary);

    const canSave = useMemo(() => {
        const nameValid = title.trim().length > 0;
        const nameChanged = title !== currentTitle;
        const summaryChanged = canEditSummary && summary !== currentSummary;
        return nameValid && (nameChanged || summaryChanged);
    }, [title, currentTitle, summary, currentSummary, canEditSummary]);

    const handleSave = useCallback(async () => {
        if (canSave) {
            const res = await updatePlaybookRun(serverUrl, playbookRunId, title.trim(), summary.trim(), canEditSummary);
            if (res.error) {
                showPlaybookErrorSnackbar();
            } else {
                close();
            }
        }
    }, [canEditSummary, canSave, playbookRunId, serverUrl, summary, title]);

    const onSave = usePreventDoubleTap(handleSave);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={onSave}
                    testID='playbooks.playbook_run.rename.button'
                    text={formatMessage({id: 'playbooks.playbook_run.rename.button', defaultMessage: 'Save'})}
                    disabled={!canSave}
                />
            ),
        });
    }, [canSave, formatMessage, onSave, navigation]);

    useAndroidHardwareBackHandler(Screens.PLAYBOOK_RENAME_RUN, close);

    const nameLabel = formatMessage({id: 'playbooks.playbook_run.rename.label', defaultMessage: 'Checklist name'});
    const summaryLabel = formatMessage({id: 'playbooks.playbook_run.edit.summary_label', defaultMessage: 'Summary'});

    return (
        <View style={styles.container}>
            <FloatingTextInput
                label={nameLabel}
                onChangeText={setTitle}
                testID='playbooks.playbook_run.rename.input'
                value={title}
                theme={theme}
                autoFocus={true}
            />
            {canEditSummary && (
                <FloatingTextInput
                    label={summaryLabel}
                    onChangeText={setSummary}
                    testID='playbooks.playbook_run.edit.summary_input'
                    value={summary}
                    theme={theme}
                    multiline={true}
                    multilineInputHeight={100}
                />
            )}
        </View>
    );
};

export default RenamePlaybookRunBottomSheet;
