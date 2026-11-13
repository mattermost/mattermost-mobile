// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';

// Matches server MaxTaskRequirementValueLength / desktop fill modal.
export const MAX_REQUIREMENT_VALUE_LENGTH = 1024;

type RequirementFieldProps = {
    requirement: TaskRequirement;
    value: string;
    error?: string;
    editable: boolean;
    theme: Theme;
    style: StyleProp<ViewStyle>;
    onChange: (id: string, next: string) => void;
};

const RequirementField = ({
    requirement,
    value,
    error,
    editable,
    theme,
    style,
    onChange,
}: RequirementFieldProps) => {
    const onChangeText = useCallback((next: string) => {
        onChange(requirement.id, next.slice(0, MAX_REQUIREMENT_VALUE_LENGTH));
    }, [onChange, requirement.id]);

    return (
        <View style={style}>
            <FloatingTextInput
                label={requirement.label}
                onChangeText={onChangeText}
                testID={`requirement-value-${requirement.id}`}
                value={value}
                theme={theme}
                error={error}
                editable={editable}
                maxLength={MAX_REQUIREMENT_VALUE_LENGTH}
            />
        </View>
    );
};

export default RequirementField;
