// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';
import {t} from '@i18n';

type CopyTextProps = {
    theme: Theme;
    isFlagged: boolean;
}

const SaveOption = ({theme, isFlagged}: CopyTextProps) => {
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
    }, [isFlagged]);

    return (
        <DrawerItem
            testID='post.options.flag.unflag'
            labelComponent={
                <FormattedText
                    id={config.id}
                    defaultMessage={config.defaultMessage}
                />
            }
            iconName='bookmark-outline'
            onPress={config.onPress}
            separator={false}
            theme={theme}
        />
    );
};

export default SaveOption;
