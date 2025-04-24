// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {useTheme} from '@context/theme';

import Button from '../button';

type ButtonProps = {
    button: SectionNoticeButtonProps;
    emphasis: 'primary' | 'tertiary' | 'link';
}

const SectionNoticeButton = ({
    button,
    emphasis,
}: ButtonProps) => {
    const theme = useTheme();
    const leadingIcon = button.leadingIcon ? {iconName: button.leadingIcon} : {};
    const trailingIcon = button.trailingIcon ? {iconName: button.trailingIcon} : {};

    return (
        <Button
            onPress={button.onClick}
            text={button.text}
            theme={theme}
            emphasis={emphasis}
            {...leadingIcon}
            {...trailingIcon}
        />
    );
};

export default SectionNoticeButton;
