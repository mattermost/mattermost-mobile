// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Alert, View} from 'react-native';

import SectionNotice from '@components/section_notice';

import {useBooleanProp, useDropdownProp, useStringProp} from './hooks';
import {buildComponent} from './utils';

const propPossibilities = {};

const sectionNoticeTypeValues = ['info', 'success', 'danger', 'welcome', 'warning', 'hint'];

const onButtonPress = (name: string) => Alert.alert(`Button pressed: ${name}`);
const onDismissPress = () => Alert.alert('Notice dismissed!');

const PRIMARY_BUTTON = {
    onClick: () => onButtonPress('primary'),
    text: 'Primary Action',
};

const SECONDARY_BUTTON = {
    onClick: () => onButtonPress('secondary'),
    text: 'Secondary Action',
};

const LINK_BUTTON = {
    onClick: () => onButtonPress('link'),
    text: 'Link Action',
};

const TAGS = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10'];

const SectionNoticeComponentLibrary = () => {
    const [title, titleSelector] = useStringProp('title', 'Notice Title', false);
    const [text, textSelector] = useStringProp('text', 'This is the notice text content with **markdown**.', false);
    const [isDismissable, isDismissableSelector] = useBooleanProp('isDismissable', false);
    const [squareCorners, squareCornersSelector] = useBooleanProp('squareCorners', false);
    const [hasPrimaryButton, hasPrimaryButtonSelector] = useBooleanProp('hasPrimaryButton', false);
    const [hasSecondaryButton, hasSecondaryButtonSelector] = useBooleanProp('hasSecondaryButton', false);
    const [hasLinkButton, hasLinkButtonSelector] = useBooleanProp('hasLinkButton', false);
    const [hasTags, hasTagsSelector] = useBooleanProp('hasTags', false);
    const [sectionNoticeType, sectionNoticeTypePossibilities, sectionNoticeTypeSelector] = useDropdownProp('type', 'info', sectionNoticeTypeValues, true);

    const primaryButton = hasPrimaryButton.hasPrimaryButton ? PRIMARY_BUTTON : undefined;
    const secondaryButton = hasSecondaryButton.hasSecondaryButton ? SECONDARY_BUTTON : undefined;
    const linkButton = hasLinkButton.hasLinkButton ? LINK_BUTTON : undefined;

    const tags = hasTags.hasTags ? TAGS : undefined;

    const components = useMemo(
        () => buildComponent(SectionNotice, propPossibilities, [
            sectionNoticeTypePossibilities,
        ], [
            title,
            text,
            isDismissable,
            squareCorners,
            {
                primaryButton,
                secondaryButton,
                linkButton,
                tags,
                onDismissClick: isDismissable.isDismissable ? onDismissPress : undefined,
                location: 'ComponentLibrary',
                testID: 'section-notice-example',
            },
            sectionNoticeType,
        ]),
        [
            sectionNoticeTypePossibilities,
            title,
            text,
            isDismissable,
            squareCorners,
            primaryButton,
            secondaryButton,
            linkButton,
            tags,
            sectionNoticeType,
        ],
    );

    return (
        <>
            {titleSelector}
            {textSelector}
            {isDismissableSelector}
            {squareCornersSelector}
            {hasPrimaryButtonSelector}
            {hasSecondaryButtonSelector}
            {hasLinkButtonSelector}
            {hasTagsSelector}
            {sectionNoticeTypeSelector}
            <View style={{gap: 16, marginTop: 16}}>{components}</View>
        </>
    );
};

export default SectionNoticeComponentLibrary;
