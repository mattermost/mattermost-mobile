// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {defineMessages, useIntl} from 'react-intl';

import OptionItem from '@components/option_item';

type ShowMoreButtonProps = {
    onPress: () => void;
    showMore: boolean;
}

const messages = defineMessages({
    showMore: {
        id: 'mobile.search.show_more',
        defaultMessage: 'Show more',
    },
    showLess: {
        id: 'mobile.search.show_less',
        defaultMessage: 'Show less',
    },
});

const ShowMoreButton = ({onPress, showMore}: ShowMoreButtonProps) => {
    const intl = useIntl();

    return (
        <OptionItem
            action={onPress}
            testID={'mobile.search.show_more'}
            type='default'
            label={intl.formatMessage(showMore ? messages.showLess : messages.showMore)}
        />
    );
};

export default ShowMoreButton;

