// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import {t} from '@i18n';

import BaseOption from './base_option';

type CopyTextProps = {
    isFlagged: boolean;
}

const SaveOption = ({isFlagged}: CopyTextProps) => {
    const handleUnflagPost = () => {
        //todo:
    };

    const handleFlagPost = () => {
        //todo:
    };

    const config = useMemo(() => {
        if (isFlagged) {
            return {id: t('mobile.post_info.unflag'), defaultMessage: 'Unsave', onPress: handleUnflagPost};
        }

        return {id: t('mobile.post_info.flag'), defaultMessage: 'Save', onPress: handleFlagPost};
    }, [isFlagged, handleFlagPost, handleUnflagPost]);

    return (
        <BaseOption
            i18nId={config.id}
            defaultMessage={config.defaultMessage}
            iconName='bookmark-outline'
            onPress={config.onPress}
            optionType='post.options.flag.unflag'
        />
    );
};

export default SaveOption;
