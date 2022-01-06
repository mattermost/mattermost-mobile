// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useState} from 'react';

export type FormInput = {
    value: string;
    onChange: (value: string) => void;
}

export const useFormInput = (initialValue?: string): FormInput => {
    const [value, setValue] = useState<string>(initialValue || '');

    function handleChange(text: string) {
        setValue(text);
    }

    return {
        value,
        onChange: handleChange,
    };
};
