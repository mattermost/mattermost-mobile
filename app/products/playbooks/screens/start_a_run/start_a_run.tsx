// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useState, useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {SafeAreaView} from 'react-native-safe-area-context';

import FloatingAutocompleteSelector from '@components/floating_input/floating_autocomplete_selector';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import NavigationButton from '@components/navigation_button';
import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {createPlaybookRun} from '@playbooks/actions/remote/runs';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ChannelOption = 'existing' | 'new';

export type Props = {
    playbook: Playbook;
    currentUserId: string;
    currentTeamId: string;
    channelId?: string;
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

const removeCallback = () => {
    CallbackStore.removeCallback();
};

function StartARun({
    playbook,
    currentUserId,
    currentTeamId,
    channelId,
}: Props) {
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const [runName, setRunName] = useState(() => {
        if (playbook?.channel_mode === 'create_new_channel') {
            return playbook.channel_name_template;
        }
        return '';
    });
    const [runDescription, setRunDescription] = useState(() => {
        if (playbook?.run_summary_template_enabled) {
            return playbook.run_summary_template;
        }
        return '';
    });
    const [channelOption, setChannelOption] = useState<ChannelOption>('existing');
    const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>(channelId);
    const [createPublicChannel, setCreatePublicChannel] = useState(false);

    const canSave = Boolean(runName.trim());

    const handleStartRun = useCallback(async () => {
        const res = await createPlaybookRun(serverUrl, playbook.id, currentUserId, currentTeamId, runName.trim(), runDescription.trim(), selectedChannelId, channelOption === 'new' ? createPublicChannel : undefined);
        if (res.error || !res.data) {
            logDebug('error on createPlaybookRun', getFullErrorMessage(res.error));
            showPlaybookErrorSnackbar();
            return;
        }
        await navigateBack();
        const onRunCreated = CallbackStore.getCallback<((run: PlaybookRun) => void)>();
        onRunCreated?.(res.data);
        removeCallback();
    }, [runName, serverUrl, playbook.id, currentUserId, currentTeamId, runDescription, selectedChannelId, channelOption, createPublicChannel]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={handleStartRun}
                    testID='start_a_run.create.button'
                    disabled={!canSave}
                    text={intl.formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'})}
                />

            ),
        });
    }, [theme, intl, canSave, navigation, handleStartRun]);

    const close = useCallback(() => {
        removeCallback();
        navigateBack();
    }, []);

    useBackNavigation(removeCallback);
    useAndroidHardwareBackHandler(Screens.PLAYBOOKS_START_A_RUN, close);

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
        setSelectedChannelId(value.value);
    }, []);

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
                    value={runName}
                    onChangeText={setRunName}
                    theme={theme}
                    testID='start_run.run_name_input'
                    error={runName.trim() ? undefined : intl.formatMessage({
                        id: 'playbooks.start_run.run_name_error',
                        defaultMessage: 'Please add a name',
                    })}
                />
                <FloatingTextInput
                    label={intl.formatMessage({
                        id: 'playbooks.start_run.run_description_label',
                        defaultMessage: 'Description',
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
                            selected={selectedChannelId}
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
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

export default StartARun;
