// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState, useRef} from 'react';

import {fetchCustomProfileAttributes} from '@actions/remote/custom_profile';
import {useServerUrl} from '@context/server';
import {getUserCustomStatus, sortCustomProfileAttributes} from '@utils/user';

import CustomAttributes from './custom_attributes';
import UserProfileCustomStatus from './custom_status';

import type {UserModel} from '@database/models/server';
import type {CustomAttribute, CustomAttributeSet} from '@typings/api/custom_profile_attributes';

type Props = {
    localTime?: string;
    showCustomStatus: boolean;
    showLocalTime: boolean;
    showNickname: boolean;
    showPosition: boolean;
    user: UserModel;
    enableCustomAttributes?: boolean;
    customAttributesSet?: CustomAttributeSet;
}

const emptyList: CustomAttribute[] = []; /** avoid re-renders **/

const UserInfo = ({
    localTime,
    showCustomStatus,
    showLocalTime,
    showNickname,
    showPosition,
    user,
    enableCustomAttributes,
    customAttributesSet,
}: Props) => {
    const customStatus = getUserCustomStatus(user);
    const serverUrl = useServerUrl();
    const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>(emptyList);
    const lastRequest = useRef(0);

    // Initial load from database and server if customAttributesSet is not provided
    useEffect(() => {
        if (enableCustomAttributes) {
            // If customAttributesSet is provided by the parent, use it
            if (customAttributesSet && Object.keys(customAttributesSet).length > 0) {
                setCustomAttributes(Object.values(customAttributesSet).sort(sortCustomProfileAttributes));
            }

            const fetchFromServer = async () => {
                const reqTime = Date.now();
                lastRequest.current = reqTime;
                fetchCustomProfileAttributes(serverUrl, user.id, true);
            };

            fetchFromServer();
        } else {
            setCustomAttributes(emptyList);
        }
    }, [enableCustomAttributes, serverUrl, user.id, customAttributesSet]);

    return (
        <>
            {showCustomStatus && <UserProfileCustomStatus customStatus={customStatus!}/>}
            <CustomAttributes
                nickname={showNickname ? user.nickname : undefined}
                position={showPosition ? user.position : undefined}
                localTime={showLocalTime ? localTime : undefined}
                customAttributes={customAttributes}
            />
        </>
    );
};

export default UserInfo;
