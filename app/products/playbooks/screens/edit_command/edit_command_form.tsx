// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {
    type LayoutChangeEvent,
    View,
    Platform,
    StyleSheet,
} from 'react-native';
import {SafeAreaView, type Edges} from 'react-native-safe-area-context';

import Autocomplete from '@components/autocomplete';
import FloatingTextInput from '@components/floating_text_input_label';
import {useTheme} from '@context/theme';
import {useAutocompleteDefaultAnimatedValues} from '@hooks/autocomplete';
import {
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';

const BOTTOM_AUTOCOMPLETE_SEPARATION = Platform.select({ios: 10, default: 10});
const LIST_PADDING = 32;
const AUTOCOMPLETE_ADJUST = 5;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainView: {
        paddingVertical: LIST_PADDING,
        paddingHorizontal: 20,
    },
});

type Props = {
    command: string;
    onCommandChange: (text: string) => void;
    channelId: string;
}

const edges: Edges = ['bottom', 'left', 'right'];
const autocompleteProviders = {
    user: false,
    channel: false,
    emoji: false,
    slash: true,
};

export default function EditCommandForm({
    command,
    onCommandChange,
    channelId,
}: Props) {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const [wrapperHeight, setWrapperHeight] = useState(0);

    const [commandFieldHeight, setCommandFieldHeight] = useState(0);

    const labelCommand = formatMessage({id: 'playbooks.edit_command.label', defaultMessage: 'Command'});
    const placeholderCommand = formatMessage({id: 'playbooks.edit_command.placeholder', defaultMessage: 'Type a command here'});

    const onLayoutCommand = useCallback((e: LayoutChangeEvent) => {
        setCommandFieldHeight(e.nativeEvent.layout.height);
    }, []);
    const onLayoutWrapper = useCallback((e: LayoutChangeEvent) => {
        setWrapperHeight(e.nativeEvent.layout.height);
    }, []);

    const spaceOnTop = LIST_PADDING - AUTOCOMPLETE_ADJUST;
    const spaceOnBottom = (wrapperHeight) - (LIST_PADDING + commandFieldHeight + BOTTOM_AUTOCOMPLETE_SEPARATION);

    const bottomPosition = (LIST_PADDING + commandFieldHeight);
    const topPosition = (wrapperHeight + AUTOCOMPLETE_ADJUST) - LIST_PADDING;
    const autocompletePosition = spaceOnBottom > spaceOnTop ? bottomPosition : topPosition;
    const autocompleteAvailableSpace = spaceOnBottom > spaceOnTop ? spaceOnBottom : spaceOnTop;
    const growDown = spaceOnBottom > spaceOnTop;

    const [animatedAutocompletePosition, animatedAutocompleteAvailableSpace] = useAutocompleteDefaultAnimatedValues(autocompletePosition, autocompleteAvailableSpace);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.container}
            testID='playbooks.edit_command.form'
            onLayout={onLayoutWrapper}
        >
            <View style={styles.mainView}>
                <FloatingTextInput
                    autoCorrect={false}
                    autoCapitalize={'none'}
                    disableFullscreenUI={true}
                    label={labelCommand}
                    placeholder={placeholderCommand}
                    onChangeText={onCommandChange}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    showErrorIcon={false}
                    spellCheck={false}
                    testID='playbooks.edit_command.input'
                    value={command}
                    theme={theme}
                    onLayout={onLayoutCommand}
                />
            </View>
            <Autocomplete
                position={animatedAutocompletePosition}
                updateValue={onCommandChange}
                cursorPosition={command.length}
                value={command}
                nestedScrollEnabled={true}
                availableSpace={animatedAutocompleteAvailableSpace}
                shouldDirectlyReact={false}
                growDown={growDown}
                channelId={channelId}
                autocompleteProviders={autocompleteProviders}
            />
        </SafeAreaView>
    );
}
