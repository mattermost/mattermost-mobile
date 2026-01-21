// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {renamePlaybookRun} from '@playbooks/actions/remote/runs';
import {navigateBack} from '@screens/navigation';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';

type Props = {
    currentTitle: string;
    playbookRunId: string;
}

const close = (): void => {
    Keyboard.dismiss();
    navigateBack();
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
});

const RenamePlaybookRunBottomSheet = ({
    currentTitle,
    playbookRunId,
}: Props) => {
    const navigation = useNavigation();
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const [title, setTitle] = useState<string>(currentTitle);

    const canSave = useMemo(() => {
        return title.trim().length > 0 && title !== currentTitle;
    }, [title, currentTitle]);

    const handleSave = useCallback(async () => {
        if (canSave) {
            const res = await renamePlaybookRun(serverUrl, playbookRunId, title.trim());
            if (res.error) {
                showPlaybookErrorSnackbar();
            } else {
                close();
            }
        }
    }, [canSave, playbookRunId, serverUrl, title]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={handleSave}
                    testID='playbooks.playbook_run.rename.button'
                    text={formatMessage({id: 'playbooks.playbook_run.rename.button', defaultMessage: 'Save'})}
                    disabled={!canSave}
                />
            ),
        });
    }, [canSave, formatMessage, handleSave, navigation]);

    useAndroidHardwareBackHandler(Screens.PLAYBOOK_RENAME_RUN, close);

    const label = formatMessage({id: 'playbooks.playbook_run.rename.label', defaultMessage: 'Checklist name'});

    return (
        <View style={styles.container}>
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
