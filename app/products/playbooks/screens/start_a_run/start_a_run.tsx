// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback, useEffect} from 'react';
import {useIntl, type IntlShape} from 'react-intl';
import {ScrollView, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import FloatingAutocompleteSelector from '@components/floating_input/floating_autocomplete_selector';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {createPlaybookRun} from '@playbooks/actions/remote/runs';
import {popTopScreen, setButtons} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {OptionsTopBarButton} from 'react-native-navigation';

type ChannelOption = 'existing' | 'new';

export type Props = {
    componentId: AvailableScreens;
    playbook: Playbook;
    currentUserId: string;
    currentTeamId: string;
    onRunCreated: (run: PlaybookRun) => void;
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
        channelInput: {
            marginLeft: 40, // Align with radio button text
        },
        channelTypeSelectorSection: {
            gap: 16,
            marginLeft: 40,
        },
    };
});

const CLOSE_BUTTON_ID = 'close-start-a-run';
const CREATE_BUTTON_ID = 'create-run';

async function makeLeftButton(theme: Theme): Promise<OptionsTopBarButton> {
    return {
        id: CLOSE_BUTTON_ID,
        icon: await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor),
        testID: 'start_a_run.close.button',
    };
}

function makeRightButton(theme: Theme, intl: IntlShape, enabled: boolean): OptionsTopBarButton {
    return {
        color: theme.sidebarHeaderTextColor,
        id: CREATE_BUTTON_ID,
        text: intl.formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
        showAsAction: 'always',
        testID: 'start_a_run.create.button',
        enabled,
    };
}

function StartARun({
    componentId,
    playbook,
    currentUserId,
    currentTeamId,
    onRunCreated,
}: Props) {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const [runName, setRunName] = useState(() => {
        if (playbook?.channel_mode === 'create_new_channel') {
            return playbook.channel_name_template || '';
        }
        return '';
    });
    const [runDescription, setRunDescription] = useState(() => {
        if (playbook?.run_summary_template_enabled) {
            return playbook.run_summary_template || '';
        }
        return '';
    });
    const [channelOption, setChannelOption] = useState<ChannelOption>('existing');
    const [channelId, setChannelId] = useState<string | undefined>(undefined);
    const [createPublicChannel, setCreatePublicChannel] = useState(false);

    const canSave = Boolean(runName.trim());

    const handleStartRun = useCallback(async () => {
        if (!runName.trim()) {
            return;
        }

        const res = await createPlaybookRun(serverUrl, playbook.id, currentUserId, currentTeamId, runName.trim(), runDescription.trim(), channelId, channelOption === 'new' ? createPublicChannel : undefined);
        if (res.error || !res.data) {
            logDebug('error on createPlaybookRun', getFullErrorMessage(res.error));
            showPlaybookErrorSnackbar();
            return;
        }
        await popTopScreen(componentId);
        onRunCreated(res.data);
    }, [runName, serverUrl, playbook.id, currentUserId, currentTeamId, runDescription, channelId, channelOption, createPublicChannel, componentId, onRunCreated]);

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
        popTopScreen(componentId);
    }, [componentId]);

    useNavButtonPressed(CREATE_BUTTON_ID, componentId, handleStartRun, [handleStartRun]);
    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, close, [close]);
    useAndroidHardwareBackHandler(componentId, close);

    const existingOptionAction = useCallback(() => {
        setChannelOption('existing');
    }, []);
    const newOptionAction = useCallback(() => {
        setChannelOption('new');
    }, []);
    const publicChannelOptionAction = useCallback(() => {
        setCreatePublicChannel(true);
    }, []);
    const privateChannelOptionAction = useCallback(() => {
        setCreatePublicChannel(false);
    }, []);

    const onChannelSelected = useCallback((value: SelectedDialogOption) => {
        if (Array.isArray(value)) {
            // Multiselect case, should never happen
            logDebug('on channel selected returned an array, this should never happen', value);
            return;
        }
        if (!value) {
            // Undefined case, should never happen
            logDebug('on channel selected returned undefined, this should never happen');
            return;
        }
        setChannelId(value.value);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
            >
                <FloatingTextInput
                    label={intl.formatMessage({
                        id: 'playbooks.start_run.run_name_label',
                        defaultMessage: 'Run name',
                    })}
                    placeholder={intl.formatMessage({
                        id: 'playbooks.start_run.run_name_placeholder',
                        defaultMessage: 'Add a name for your run',
                    })}
                    value={runName}
                    onChangeText={setRunName}
                    theme={theme}
                    testID='start_run.run_name_input'
                    error={runName.trim() ? undefined : intl.formatMessage({
                        id: 'playbooks.start_run.run_name_error',
                        defaultMessage: 'Please add a name for this run',
                    })}
                />
                <FloatingTextInput
                    label={intl.formatMessage({
                        id: 'playbooks.start_run.run_description_label',
                        defaultMessage: 'Run description',
                    })}
                    value={runDescription}
                    onChangeText={setRunDescription}
                    multiline={true}
                    multilineInputHeight={100}
                    theme={theme}
                    testID='start_run.run_description_input'
                />

                <OptionItem
                    label={intl.formatMessage({
                        id: 'playbooks.start_run.link_existing_channel',
                        defaultMessage: 'Link to an existing channel',
                    })}
                    type='radio'
                    selected={channelOption === 'existing'}
                    action={existingOptionAction}
                    testID='start_run.existing_channel_option'
                />
                {channelOption === 'existing' && (
                    <View style={styles.channelInput}>
                        <FloatingAutocompleteSelector
                            label={intl.formatMessage({
                                id: 'playbooks.start_run.channel_label',
                                defaultMessage: 'Channel',
                            })}
                            dataSource='channels'
                            selected={channelId}
                            onSelected={onChannelSelected}
                            testID='start_run.existing_channel_selector'
                        />
                    </View>
                )}
                <OptionItem
                    label={intl.formatMessage({
                        id: 'playbooks.start_run.create_new_channel',
                        defaultMessage: 'Create a new channel',
                    })}
                    type='radio'
                    selected={channelOption === 'new'}
                    action={newOptionAction}
                    testID='start_run.new_channel_option'
                />
                {channelOption === 'new' && (
                    <View style={styles.channelTypeSelectorSection}>
                        <OptionItem
                            label={intl.formatMessage({
                                id: 'playbooks.start_run.create_new_channel.public_channel',
                                defaultMessage: 'Public channel',
                            })}
                            type='radio'
                            selected={createPublicChannel}
                            action={publicChannelOptionAction}
                            testID='start_run.new_channel_public_option'
                        />
                        <OptionItem
                            label={intl.formatMessage({
                                id: 'playbooks.start_run.create_new_channel.private_channel',
                                defaultMessage: 'Private channel',
                            })}
                            type='radio'
                            selected={!createPublicChannel}
                            action={privateChannelOptionAction}
                            testID='start_run.new_channel_private_option'
                        />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

export default StartARun;
