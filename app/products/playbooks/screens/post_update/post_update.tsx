// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Keyboard, StyleSheet, View} from 'react-native';

import FloatingAutocompleteSelector from '@components/floating_input/floating_autocomplete_selector';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {postStatusUpdate} from '@playbooks/actions/remote/runs';
import {buildNavigationButton, popTopScreen, setButtons} from '@screens/navigation';
import {toSeconds} from '@utils/datetime';
import {logDebug} from '@utils/log';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    playbookRunId: string;
    template: string;
    runName: string;
    userId: string;
    channelId?: string;
    teamId: string;
    outstanding: number;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        gap: 12,
    },
});

const SAVE_BUTTON_ID = 'save-post-update';

const close = (componentId: AvailableScreens): void => {
    Keyboard.dismiss();
    popTopScreen(componentId);
};

const valueToTimeMap = {
    '15_minutes': toSeconds({minutes: 15}),
    '30_minutes': toSeconds({minutes: 30}),
    '1_hour': toSeconds({hours: 1}),
    '4_hours': toSeconds({hours: 4}),
    '1_day': toSeconds({days: 1}),
    '7_days': toSeconds({days: 7}),
};

type NextUpdateValues = keyof typeof valueToTimeMap;

const PostUpdate = ({
    componentId,
    playbookRunId,
    template,
    runName,
    userId,
    channelId,
    teamId,
    outstanding,
}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [updateMessage, setUpdateMessage] = useState(template);
    const [nextUpdate, setNextUpdate] = useState<NextUpdateValues>('15_minutes');
    const [alsoMarkRunAsFinished, setAlsoMarkRunAsFinished] = useState(false);
    const [canSave, setCanSave] = useState(template.length > 0);

    const onChangeText = useCallback((text: string) => {
        setUpdateMessage(text);
        setCanSave(text.trim().length > 0);
    }, []);

    const rightButton = useMemo(() => {
        const base = buildNavigationButton(
            SAVE_BUTTON_ID,
            'playbooks.edit_command.save.button',
            undefined,
            intl.formatMessage({id: 'playbooks.post_update.post.button', defaultMessage: 'Post'}),
        );
        base.enabled = canSave;
        base.color = theme.sidebarHeaderTextColor;
        return base;
    }, [intl, canSave, theme.sidebarHeaderTextColor]);

    useEffect(() => {
        setButtons(componentId, {
            rightButtons: [rightButton],
        });
    }, [rightButton, componentId]);

    const onNextUpdateSelected = useCallback((value: SelectedDialogOption) => {
        if (!value) {
            return;
        }
        if (Array.isArray(value)) {
            // Multiselect, which should never happen
            return;
        }

        setNextUpdate(value.value as NextUpdateValues);
    }, [setNextUpdate]);

    const dialogOptions = useMemo<DialogOption[]>(() => {
        return [
            {
                text: intl.formatMessage({id: 'playbooks.post_update.option.15_minutes', defaultMessage: '15 minutes'}),
                value: '15_minutes',
            },
            {
                text: intl.formatMessage({id: 'playbooks.post_update.option.30_minutes', defaultMessage: '30 minutes'}),
                value: '30_minutes',
            },
            {
                text: intl.formatMessage({id: 'playbooks.post_update.option.1_hour', defaultMessage: '1 hour'}),
                value: '1_hour',
            },
            {
                text: intl.formatMessage({id: 'playbooks.post_update.option.4_hours', defaultMessage: '4 hours'}),
                value: '4_hours',
            },
            {
                text: intl.formatMessage({id: 'playbooks.post_update.option.1_day', defaultMessage: '1 day'}),
                value: '1_day',
            },
            {
                text: intl.formatMessage({id: 'playbooks.post_update.option.7_days', defaultMessage: '7 days'}),
                value: '7_days',
            },
        ];
    }, [intl]);

    const handleClose = useCallback(() => {
        close(componentId);
    }, [componentId]);

    const onConfirm = useCallback(() => {
        close(componentId);
        if (!channelId) {
            // This should never happen, but this keeps typescript happy
            logDebug('cannot post status update without a channel id');
            return;
        }
        postStatusUpdate(serverUrl, playbookRunId, {message: updateMessage, reminder: valueToTimeMap[nextUpdate], finishRun: alsoMarkRunAsFinished}, {user_id: userId, channel_id: channelId, team_id: teamId});
    }, [alsoMarkRunAsFinished, channelId, componentId, nextUpdate, playbookRunId, serverUrl, teamId, updateMessage, userId]);

    const onPostUpdate = useCallback(() => {
        if (alsoMarkRunAsFinished) {
            let message = intl.formatMessage({id: 'playbooks.post_update.confirm.message', defaultMessage: 'Are you sure you want to finish the run {runName} for all participants?'}, {runName});
            if (outstanding > 0) {
                message = intl.formatMessage({id: 'playbooks.post_update.confirm.message.with_tasks', defaultMessage: 'There {outstanding, plural, =1 {is # outstanding task} other {are # outstanding tasks}}. Are you sure you want to finish the run {runName} for all participants?'}, {runName, outstanding});
            }
            Alert.alert(
                intl.formatMessage({id: 'playbooks.post_update.confirm.title', defaultMessage: 'Confirm finish run'}),
                message,
                [
                    {
                        text: intl.formatMessage({id: 'playbooks.post_update.confirm.cancel', defaultMessage: 'Cancel'}),
                        style: 'cancel',
                    },
                    {
                        text: intl.formatMessage({id: 'playbooks.post_update.confirm.confirm', defaultMessage: 'Finish run'}),
                        onPress: onConfirm,
                    },
                ],
            );
        } else {
            onConfirm();
        }
    }, [alsoMarkRunAsFinished, intl, onConfirm, outstanding, runName]);

    useNavButtonPressed(SAVE_BUTTON_ID, componentId, onPostUpdate, [onPostUpdate]);
    useAndroidHardwareBackHandler(componentId, handleClose);
    return (
        <View style={styles.container}>
            <FloatingTextInput
                label={intl.formatMessage({id: 'playbooks.post_update.label', defaultMessage: 'Update message'})}
                placeholder={intl.formatMessage({id: 'playbooks.post_update.placeholder', defaultMessage: 'Enter your update message'})}
                value={updateMessage}
                onChangeText={onChangeText}
                theme={theme}
                multiline={true}
            />
            <FloatingAutocompleteSelector
                options={dialogOptions}
                testID='playbooks.post_update.selector'
                selected={nextUpdate}
                onSelected={onNextUpdateSelected}
                label={intl.formatMessage({id: 'playbooks.post_update.label.next_update', defaultMessage: 'Timer for next update'})}
            />
            <OptionItem
                label={intl.formatMessage({id: 'playbooks.post_update.label.also_mark_run_as_finished', defaultMessage: 'Also mark the run as finished'})}
                action={setAlsoMarkRunAsFinished}
                testID='playbooks.post_update.selector.also_mark_run_as_finished'
                selected={alsoMarkRunAsFinished}
                type='toggle'
            />
        </View>
    );
};

export default PostUpdate;
