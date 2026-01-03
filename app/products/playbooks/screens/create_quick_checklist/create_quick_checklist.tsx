// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useState, useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {SafeAreaView} from 'react-native-safe-area-context';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {createPlaybookRun, fetchPlaybookRunsForChannel} from '@playbooks/actions/remote/runs';
import {goToPlaybookRun} from '@playbooks/screens/navigation';
import {navigateBack} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';

export type PlaybookCreateQuickChecklistScreenProps = {
    channelId: string;
    channelName: string;
    currentUserId: string;
    currentTeamId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        content: {
            flex: 1,
            paddingHorizontal: 20,
            paddingVertical: 24,
        },
        contentContainer: {
            gap: 16,
        },
    };
});

function CreateQuickChecklist({
    channelId,
    channelName,
    currentUserId,
    currentTeamId,
}: PlaybookCreateQuickChecklistScreenProps) {
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [checklistName, setChecklistName] = useState(`${channelName} Checklist`);
    const [description, setDescription] = useState('');
    const canSave = Boolean(checklistName.trim());

    const handleCreate = usePreventDoubleTap(useCallback(async () => {
        const res = await createPlaybookRun(
            serverUrl,
            '', // empty playbook_id for standalone checklist
            currentUserId,
            currentTeamId,
            checklistName.trim(),
            description.trim(),
            channelId,
        );

        if (res.error || !res.data) {
            logError('error on createPlaybookRun', getFullErrorMessage(res.error));
            showPlaybookErrorSnackbar();
            return;
        }

        // Pop the create screen first, then navigate to the run
        // This ensures the back button goes back to the channel, not the create screen
        await navigateBack();
        await fetchPlaybookRunsForChannel(serverUrl, channelId);
        await goToPlaybookRun(res.data.id);
    }, [serverUrl, currentUserId, currentTeamId, checklistName, description, channelId]));

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={handleCreate}
                    disabled={!canSave}
                    text={intl.formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'})}
                    testID='create_quick_checklist.create.button'
                />
            )});
    }, [theme, intl, canSave, navigation, handleCreate]);

    const close = useCallback(() => {
        Keyboard.dismiss();
        navigateBack();
    }, []);

    useAndroidHardwareBackHandler(Screens.PLAYBOOKS_CREATE_QUICK_CHECKLIST, close);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAwareScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps='handled'
            >
                <FloatingTextInput
                    label={intl.formatMessage({
                        id: 'playbooks.start_run.run_name_label',
                        defaultMessage: 'Name',
                    })}
                    placeholder={intl.formatMessage({
                        id: 'playbooks.start_run.run_name_placeholder',
                        defaultMessage: 'Add a name',
                    })}
                    value={checklistName}
                    onChangeText={setChecklistName}
                    theme={theme}
                    testID='create_quick_checklist.name_input'
                    error={checklistName.trim() ? undefined : intl.formatMessage({
                        id: 'playbooks.start_run.run_name_error',
                        defaultMessage: 'Please add a name',
                    })}
                />
                <FloatingTextInput
                    label={intl.formatMessage({
                        id: 'playbooks.start_checklist.description_label',
                        defaultMessage: 'Description (optional)',
                    })}
                    value={description}
                    onChangeText={setDescription}
                    multiline={true}
                    multilineInputHeight={100}
                    theme={theme}
                    testID='create_quick_checklist.description_input'
                />
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

export default CreateQuickChecklist;

