// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import Tag, {BotTag, GuestTag} from '@components/tag';
import {t} from '@i18n';

type HeaderTagProps = {
    isAutomation?: boolean;
    isAutoResponder?: boolean;
    isGuest?: boolean;
}

const style = StyleSheet.create({
    tag: {
        marginLeft: 0,
        marginRight: 5,
        marginBottom: 5,
    },
});

const HeaderTag = ({
    isAutomation, isAutoResponder, isGuest,
}: HeaderTagProps) => {
    if (isAutomation) {
        return (
            <BotTag
                style={style.tag}
                testID='post_header.bot_tag'
            />
        );
    } else if (isGuest) {
        return (
            <GuestTag
                style={style.tag}
                testID='post_header.guest_tag'
            />
        );
    } else if (isAutoResponder) {
        return (
            <Tag
                id={t('post_info.auto_responder')}
                defaultMessage={'Automatic Reply'}
                style={style.tag}
            />
        );
    }

    return null;
};

export default HeaderTag;
