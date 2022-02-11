// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

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

    const config = useMemo(() => {
        if (isSaved) {
            return {id: t('mobile.post_info.unflag'), defaultMessage: 'Unsave', onPress: handleUnflagPost};
        }

        return {id: t('mobile.post_info.flag'), defaultMessage: 'Save', onPress: handleFlagPost};
    }, [isSaved, handleFlagPost, handleUnflagPost]);

    return (
        <BaseOption
            i18nId={config.id}
            defaultMessage={config.defaultMessage}
            iconName='bookmark-outline'
            onPress={config.onPress}
            testID='post.options.flag.unflag'
        />
    );
};

export default SaveOption;
