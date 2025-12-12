// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Button from '@components/button';
import FloatingTextInput, {type FloatingTextInputRef} from '@components/floating_input/floating_text_input_label';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        modalContent: {
            padding: 20,
        },
        buttonContainer: {
            marginTop: 20,
        },
    };
});

type PropertyFieldEditorProps = {
    initialValue: string;
    label: string;
    onSave: (value: string) => void;
    theme: Theme;
    testID: string;
};

const PropertyFieldEditor: React.FC<PropertyFieldEditorProps> = ({
    initialValue,
    label,
    onSave,
    theme,
    testID,
}) => {
    const intl = useIntl();
    const [tempValue, setTempValue] = useState(initialValue);
    const inputRef = useRef<FloatingTextInputRef>(null);
    const styles = getStyleSheet(theme);

    const handleSave = useCallback(() => {
        onSave(tempValue);
    }, [tempValue, onSave]);

    return (
        <View style={styles.modalContent}>
            <FloatingTextInput
                ref={inputRef}
                rawInput={true}
                disableFullscreenUI={true}
                editable={true}
                keyboardType='default'
                label={label}
                onChangeText={setTempValue}
                testID={`${testID}.input.modal`}
                theme={theme}
                value={tempValue}
                autoFocus={true}
            />
            <View style={styles.buttonContainer}>
                <Button
                    onPress={handleSave}
                    text={intl.formatMessage({id: 'mobile.managed_app.save', defaultMessage: 'Update'})}
                    theme={theme}
                    size='lg'
                    emphasis='primary'
                />
            </View>
        </View>
    );
};

export default PropertyFieldEditor;
