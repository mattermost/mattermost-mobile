// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {t} from '@i18n';

import BaseOption from './base_option';

type CopyTextProps = {
    isSaved: boolean;
}

const SaveOption = ({isSaved}: CopyTextProps) => {
    const handleUnsavePost = () => {
        //todo:
    };

    const handleSavePost = () => {
        //todo:
    };

    const id = isSaved ? t('mobile.post_info.unsave') : t('mobile.post_info.save');
    const defaultMessage = isSaved ? 'Unsave' : 'Save';
    const onPress = isSaved ? handleUnsavePost : handleSavePost;

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            iconName='bookmark-outline'
            onPress={onPress}
            testID='post.options.flag.unflag'
        />
    );
};

export default SaveOption;
