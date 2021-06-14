// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import Tag, {BotTag, GuestTag} from '@components/tag';
import {t} from '@utils/i18n';

import type {Theme} from '@mm-redux/types/preferences';

type HeaderTagProps = {
    isAutomation?: boolean;
    isAutoResponder?: boolean;
    isGuest?: boolean;
    theme: Theme;
}

const style = StyleSheet.create({
    tag: {
        marginLeft: 0,
        marginRight: 5,
        marginBottom: 5,
    },
});

const HeaderTag = ({
    isAutomation, isAutoResponder, isGuest, theme,
}: HeaderTagProps) => {
    if (isAutomation) {
        return (
            <BotTag
                style={style.tag}
                theme={theme}
            />
        );
    } else if (isGuest) {
        return (
            <GuestTag
                style={style.tag}
                testID='post_header.guest_tag'
                theme={theme}
            />
        );
    } else if (isAutoResponder) {
        return (
            <Tag
                id={t('post_info.auto_responder')}
                defaultMessage={'AUTOMATIC REPLY'}
                style={style.tag}
                theme={theme}
            />
        );
    }

    return null;
};

export default HeaderTag;
