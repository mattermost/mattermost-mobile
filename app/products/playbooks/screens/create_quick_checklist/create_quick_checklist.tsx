// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback, useEffect} from 'react';
import {useIntl, type IntlShape} from 'react-intl';
import {Keyboard, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {usePreventDoubleTap} from '@hooks/utils';
import {createPlaybookRun, fetchPlaybookRunsForChannel} from '@playbooks/actions/remote/runs';
import {goToPlaybookRun} from '@playbooks/screens/navigation';
import {popTopScreen, setButtons} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {OptionsTopBarButton} from 'react-native-navigation';

type Props = {
    componentId: AvailableScreens;
    channelId: string;
    channelName: string;
    currentUserId: string;
    currentTeamId: string;
    serverUrl: string;
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

const CLOSE_BUTTON_ID = 'close-create-quick-checklist';
const CREATE_BUTTON_ID = 'create-quick-checklist';

async function makeLeftButton(theme: Theme): Promise<OptionsTopBarButton> {
    return {
        id: CLOSE_BUTTON_ID,
        icon: await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor),
        testID: 'create_quick_checklist.close.button',
    };
}

function makeRightButton(theme: Theme, intl: IntlShape, enabled: boolean): OptionsTopBarButton {
    return {
        color: theme.sidebarHeaderTextColor,
        id: CREATE_BUTTON_ID,
        text: intl.formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
        showAsAction: 'always',
        testID: 'create_quick_checklist.create.button',
        enabled,
    };
}

function CreateQuickChecklist({
    componentId,
    channelId,
    channelName,
    currentUserId,
    currentTeamId,
    serverUrl,
}: Props) {
    const theme = useTheme();
    const intl = useIntl();
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
        await popTopScreen(componentId);
        await fetchPlaybookRunsForChannel(serverUrl, channelId);
        await goToPlaybookRun(intl, res.data.id);
    }, [serverUrl, currentUserId, currentTeamId, checklistName, description, channelId, componentId, intl]));

    useEffect(() => {
        async function asyncWrapper() {
            const leftButton = await makeLeftButton(theme);
            const rightButton = makeRightButton(theme, intl, canSave);

            setButtons(
                componentId,
                {
                    leftButtons: [leftButton],
                    rightButtons: [rightButton],
                },
            );
        }

        asyncWrapper();
    }, [componentId, theme, intl, canSave]);

    const close = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, [componentId]);

    useNavButtonPressed(CREATE_BUTTON_ID, componentId, handleCreate, [handleCreate]);
    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, close, [close]);
    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
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
            </ScrollView>
        </SafeAreaView>
    );
}

export default CreateQuickChecklist;

