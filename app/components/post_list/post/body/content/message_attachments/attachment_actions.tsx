// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ActionButton from './action_button';
import ActionMenu from './action_menu';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    actions: PostAction[];
    postId: string;
    theme: Theme;
    location: AvailableScreens;
}
const AttachmentActions = ({
    actions,
    postId,
    theme,
    location,
}: Props) => {
    const content: React.ReactNode[] = [];

    actions.forEach((action) => {
        if (!action.id || !action.name) {
            return;
        }

        switch (action.type) {
            case 'select':
                content.push(
                    <ActionMenu
                        key={action.id}
                        id={action.id}
                        name={action.name}
                        dataSource={action.data_source}
                        defaultOption={action.default_option}
                        options={action.options}
                        postId={postId}
                        disabled={action.disabled}
                        location={location}
                    />,
                );
                break;
            case 'button':
            default:
                content.push(
                    <ActionButton
                        key={action.id}
                        id={action.id}
                        cookie={action.cookie}
                        name={action.name}
                        postId={postId}
                        disabled={action.disabled}
                        buttonColor={action.style}
                        theme={theme}
                    />,
                );
                break;
        }
    });

    return content.length ? (<>{content}</>) : null;
};

export default AttachmentActions;
