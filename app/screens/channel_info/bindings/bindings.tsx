// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {intlShape, injectIntl} from 'react-intl';

import Separator from '@screens/channel_info/separator';

import ChannelInfoRow from '../channel_info_row';
import {AppBinding, AppCall} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';
import {Channel} from '@mm-redux/types/channels';
import {AppCallTypes, AppExpandLevels, AppBindingLocations} from '@mm-redux/constants/apps';
import {UserProfile} from '@mm-redux/types/users';
import {dismissModal} from '@actions/navigation';

type Props = {
    bindings: AppBinding[];
    theme: Theme;
    currentChannel: Channel;
    currentUser: UserProfile;
    appsEnabled: boolean;
    actions: {
        doAppCall: (call: AppCall, intl: any) => void
    }
}

const Bindings = (props: Props) => {
    if (!props.appsEnabled) {
        return null;
    }

    const {bindings, ...optionProps} = props;
    if (bindings.length === 0) {
        return null;
    }

    const options = bindings.map((b) => (
        <Option
            key={b.app_id + b.location}
            binding={b}
            {...optionProps}
        />
    ));

    return (
        <>
            {options}
        </>
    );
};

export default Bindings;

type OptionProps = {
    binding: AppBinding;
    theme: Theme;
    currentChannel: Channel;
    currentUser: UserProfile;
    intl: typeof intlShape;
    actions: {
        doAppCall: (call: AppCall, intl: any) => void,
    },
}

const Option = injectIntl((props: OptionProps) => {
    const onPress = () => {
        const channelId = props.currentChannel.id;

        // TODO Consider handling result here
        props.actions.doAppCall({
            type: AppCallTypes.SUBMIT,
            values: {
                ...props.binding.call?.values,
            },
            expand: {
                channel: AppExpandLevels.EXPAND_ALL,
                ...props.binding.call?.expand,
            },
            context: {
                app_id: props.binding.app_id,
                channel_id: channelId,
                location: AppBindingLocations.CHANNEL_HEADER_ICON,
                user_id: props.currentUser.id,
            },
            url: props.binding.call?.url || '',
        }, props.intl);

        dismissModal();
    };

    const {binding, theme} = props;
    return (
        <>
            <Separator theme={theme}/>
            <ChannelInfoRow
                action={onPress}
                defaultMessage={binding.label}
                theme={theme}
                textId={binding.app_id + binding.location}
                image={{uri: binding.icon}}
            />
        </>
    );
});
