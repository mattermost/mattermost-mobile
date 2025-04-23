// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';

import Tag from '@components/tag/base_tag';
import {useTheme} from '@context/theme';

import {useBooleanProp, useDropdownProp, useStringProp} from './hooks';
import {buildComponent} from './utils';

const propPossibilities = {};

const tagTypeValues = ['general', 'info', 'danger', 'success', 'warning', 'infoDim'];
const tagSizeValues = ['xs', 's', 'm'];

const TagComponentLibrary = () => {
    const theme = useTheme();
    const [text, textSelector] = useStringProp('text', 'Tag text', false);
    const [icon, iconSelector] = useStringProp('icon', 'check', false);
    const [useIcon, useIconSelector] = useBooleanProp('useIcon', true);
    const [uppercase, uppercaseSelector] = useBooleanProp('uppercase', true);
    const [tagType, tagTypePossibilities, tagTypeSelector] = useDropdownProp('type', 'general', tagTypeValues, true);
    const [tagSize, tagSizePossibilities, tagSizeSelector] = useDropdownProp('size', 's', tagSizeValues, true);

    const components = useMemo(
        () => buildComponent(Tag, propPossibilities, [
            tagTypePossibilities,
            tagSizePossibilities,
        ], [
            {
                message: text.text,
                icon: useIcon.useIcon ? icon.icon : undefined,
                theme,
                testID: 'tag-example',
                uppercase: uppercase.uppercase,
            },
            tagType,
            tagSize,
        ]),
        [tagTypePossibilities, tagSizePossibilities, text.text, useIcon.useIcon, icon.icon, theme, uppercase.uppercase, tagType, tagSize],
    );

    return (
        <>
            {textSelector}
            {iconSelector}
            {useIconSelector}
            {uppercaseSelector}
            {tagTypeSelector}
            {tagSizeSelector}
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{components}</View>
        </>
    );
};

export default TagComponentLibrary;
