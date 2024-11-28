// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import type UserModel from '@typings/database/models/app/user';

const {APP: {USER}} = MM_TABLES;

/**
 * Updates a user's password in the database.
 * 
 * @param userid - The unique identifier of the user.
 * @param newPassword - The new password to set for the user.
 * @returns A boolean indicating success (true) or failure (false).
 */
export const updatePassword = async (userid: string, newPassword: string): Promise<boolean> => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        const userCollection = database.get<UserModel>(USER);

        // Find the user by their ID
        const user = await userCollection.query(
            Q.where('id', userid),
        ).fetch();

        if (user.length === 0) {
            console.error(`User with ID ${userid} not found.`);
            return false;
        }

        // Update the password field for the user
        await database.write(async () => {
            await user[0].update((u) => {
                u.password = newPassword;
            });
        });

        return true;
    } catch (error) {
        console.error('Failed to update password:', error);
        return false;
    }
};