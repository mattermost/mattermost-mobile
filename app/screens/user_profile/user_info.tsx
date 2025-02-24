// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState, useRef} from 'react';

import {fetchCustomAttributes} from '@actions/remote/user';
import {useServerUrl} from '@context/server';
import {getUserCustomStatus, sortCustomProfileAttributes} from '@utils/user';

import CustomAttributes from './custom_attributes';
import UserProfileCustomStatus from './custom_status';

import type {UserModel} from '@database/models/server';
import type {CustomAttribute} from '@typings/api/custom_profile_attributes';

type Props = {
    localTime?: string;
    showCustomStatus: boolean;
    showLocalTime: boolean;
    showNickname: boolean;
    showPosition: boolean;
    user: UserModel;
    enableCustomAttributes?: boolean;
}

const emptyList: CustomAttribute[] = []; /** avoid re-renders **/

const UserInfo = ({localTime, showCustomStatus, showLocalTime, showNickname, showPosition, user, enableCustomAttributes}: Props) => {
    const customStatus = getUserCustomStatus(user);
    const serverUrl = useServerUrl();
    const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>(emptyList);

    const lastRequest = useRef(0);

    useEffect(() => {
        if (enableCustomAttributes) {
            const fetchData = async () => {
                const reqTime = Date.now();
                lastRequest.current = reqTime;
                const {attributes, error} = await fetchCustomAttributes(serverUrl, user.id, true);
                if (!error && lastRequest.current === reqTime) {
                    const attributesList = Object.values(attributes).sort(sortCustomProfileAttributes);
                    setCustomAttributes(attributesList);
                } else {
                    setCustomAttributes(emptyList);
                }
            };

            fetchData();
        } else {
            setCustomAttributes(emptyList);
        }
    }, [enableCustomAttributes, serverUrl, user.id]);

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
