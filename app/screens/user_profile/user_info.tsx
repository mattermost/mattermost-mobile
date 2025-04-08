// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState, useRef} from 'react';

import {fetchCustomProfileAttributes} from '@actions/remote/custom_profile';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {
    convertProfileAttributesToCustomAttributes,
    observeCustomProfileAttributesByUserId,
    queryCustomProfileAttributesByUserId,
    observeCustomProfileFields,
} from '@queries/servers/custom_profile';
import {logError} from '@utils/log';
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

    // Observe custom profile attributes from the database
    const database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    const dbAttributes = useState(() =>
        (enableCustomAttributes ? observeCustomProfileAttributesByUserId(database, user.id) : null),
    )[0];

    // Observe custom profile fields from the database, currently observing all, once we have more properties we'll need to observe by group id
    const dbFields = useState(() =>
        (enableCustomAttributes ? observeCustomProfileFields(database) : null),
    )[0];

    const lastRequest = useRef(0);

    // Initial load from database and then from server
    useEffect(() => {
        if (enableCustomAttributes) {
            const loadFromDatabase = async () => {
                try {
                    // Load from database first
                    const attrs = await queryCustomProfileAttributesByUserId(database, user.id).fetch();
                    if (attrs.length) {
                        const converted = await convertProfileAttributesToCustomAttributes(
                            database,
                            attrs,
                            sortCustomProfileAttributes,
                        );
                        if (converted.length) {
                            setCustomAttributes(converted);
                        }
                    }
                } catch (error) {
                    logError('Error loading custom attributes from database', error);
                }

                // After database load, fetch from server for latest data
                fetchFromServer();
            };

            const fetchFromServer = async () => {
                const reqTime = Date.now();
                lastRequest.current = reqTime;
                const {attributes, error} = await fetchCustomProfileAttributes(serverUrl, user.id, true);
                if (!error && lastRequest.current === reqTime && Object.keys(attributes).length > 0) {
                    const attributesList = Object.values(attributes).sort(sortCustomProfileAttributes);
                    setCustomAttributes(attributesList);
                }
            };

            loadFromDatabase();
        } else {
            setCustomAttributes(emptyList);
        }
    }, [enableCustomAttributes, serverUrl, user.id, database]);

    // Update when database changes using the observables
    useEffect(() => {
        if (dbAttributes || dbFields) {
            const subscriptions: Array<{unsubscribe: () => void}> = [];

            if (dbAttributes) {
                const attributesSubscription = dbAttributes.subscribe(async (attributes) => {
                    if (attributes?.length) {
                        const converted = await convertProfileAttributesToCustomAttributes(
                            database,
                            attributes,
                            sortCustomProfileAttributes,
                        );
                        setCustomAttributes(converted);
                    }
                });
                subscriptions.push(attributesSubscription);
            }

            if (dbFields) {
                const fieldsSubscription = dbFields.subscribe(async () => {
                    // When fields change, we need to reconvert the attributes to get the updated order
                    const attrs = await queryCustomProfileAttributesByUserId(database, user.id).fetch();
                    if (attrs.length) {
                        const converted = await convertProfileAttributesToCustomAttributes(
                            database,
                            attrs,
                            sortCustomProfileAttributes,
                        );
                        setCustomAttributes(converted);
                    }
                });
                subscriptions.push(fieldsSubscription);
            }

            return () => {
                subscriptions.forEach((subscription) => subscription.unsubscribe());
            };
        }
        return undefined;
    }, [dbAttributes, dbFields, database, user.id]);

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
