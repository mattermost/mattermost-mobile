// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type ShowMoreButtonProps = {
    onPress: () => void;
    showMore: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        showMore: {
            color: theme.buttonBg,
            paddingLeft: 20,
            ...typography('Body', 200, 'SemiBold'),
        },
    };
});

const ShowMoreButton = ({onPress, showMore}: ShowMoreButtonProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    let id = t('mobile.search.show_more');
    let defaultMessage = 'Show more';
    if (showMore) {
        id = t('mobile.search.show_less');
        defaultMessage = 'Show less';
    }

    return (
        <OptionItem
            action={onPress}
            testID={'mobile.search.show_more'}
            type='default'
            label={intl.formatMessage({id, defaultMessage})}
            optionLabelTextStyle={styles.showMore}
        />
    );
};

export default ShowMoreButton;

