// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {intlShape} from 'react-intl';

import {goToScreen} from '@actions/navigation';
import {Theme} from '@mm-redux/types/preferences';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import Separator from '@screens/channel_info/separator';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

interface EditChannelProps {
    testID?: string;
    canEdit: boolean;
    theme: Theme;
}

export default class EditChannel extends PureComponent<EditChannelProps> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    handleChannelEdit = preventDoubleTap(() => {
        const {intl} = this.context;
        const id = t('mobile.channel_info.edit');
        const defaultMessage = 'Edit Channel';
        const screen = 'EditChannel';
        const title = intl.formatMessage({id, defaultMessage});

        goToScreen(screen, title);
    });

    render() {
        const {testID, canEdit, theme} = this.props;

        if (!canEdit) {
            return null;
        }

        return (
            <>
                <Separator theme={theme}/>
                <ChannelInfoRow
                    testID={testID}
                    action={this.handleChannelEdit}
                    defaultMessage='Edit Channel'
                    icon='pencil-outline'
                    textId={t('mobile.channel_info.edit')}
                    theme={theme}
                />
            </>
        );
    }
}
