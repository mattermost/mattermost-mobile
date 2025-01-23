// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {deleteCategory, storeCategories} from '@actions/local/category';
import {fetchCategories} from '@actions/remote/category';
import DatabaseManager from '@database/manager';
import {queryCategoriesById} from '@queries/servers/categories';

import {handleCategoryCreatedEvent, handleCategoryUpdatedEvent, handleCategoryDeletedEvent, handleCategoryOrderUpdatedEvent, type WebsocketCategoriesMessage} from './category';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/local/category');
jest.mock('@actions/remote/category');
jest.mock('@database/manager');
jest.mock('@queries/servers/categories');

describe('WebSocket Category Actions', () => {
    const serverUrl = 'baseHandler.test.com';
    const teamId = 'team-id';
    const categoryId = 'category-id';

    let operator: ServerDataOperator;
    let batchRecords: jest.SpyInstance;

    beforeEach(async () => {
        jest.clearAllMocks();

        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        batchRecords = jest.spyOn(operator, 'batchRecords').mockResolvedValue();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.restoreAllMocks();
    });

    describe('handleCategoryCreatedEvent', () => {
        it('should handle valid category creation', async () => {
            const mockCategory = {
                id: categoryId,
                team_id: teamId,
                display_name: 'Test Category',
            };

            const msg = {
                data: {
                    category: JSON.stringify(mockCategory),
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryCreatedEvent(serverUrl, msg);

            expect(storeCategories).toHaveBeenCalledWith(serverUrl, [mockCategory]);
        });

        it('should handle invalid JSON in category data', async () => {
            const msg = {
                data: {
                    category: 'invalid-json',
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryCreatedEvent(serverUrl, msg);

            expect(fetchCategories).toHaveBeenCalledWith(serverUrl, teamId);
        });

        it('should handle invalid JSON in category data - no team id', async () => {
            const msg = {
                data: {
                    category: 'invalid-json',
                },
                broadcast: {},
            } as WebsocketCategoriesMessage;

            await handleCategoryCreatedEvent(serverUrl, msg);

            expect(fetchCategories).not.toHaveBeenCalled();
        });

        it('should handle missing category data', async () => {
            const msg = {
                data: {},
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryCreatedEvent(serverUrl, msg);

            expect(storeCategories).not.toHaveBeenCalled();
        });
    });

    describe('handleCategoryUpdatedEvent', () => {
        it('should handle valid category updates', async () => {
            const mockCategories = [{
                id: categoryId,
                team_id: teamId,
                display_name: 'Updated Category',
            }];

            const msg = {
                data: {
                    updatedCategories: JSON.stringify(mockCategories),
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryUpdatedEvent(serverUrl, msg);

            expect(storeCategories).toHaveBeenCalledWith(serverUrl, mockCategories);
        });

        it('should handle invalid JSON in updated categories', async () => {
            const msg = {
                data: {
                    updatedCategories: 'invalid-json',
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryUpdatedEvent(serverUrl, msg);

            expect(fetchCategories).toHaveBeenCalledWith(serverUrl, teamId, true);
        });

        it('should handle invalid JSON in updated categories - no team id', async () => {
            const msg = {
                data: {
                    updatedCategories: 'invalid-json',
                },
                broadcast: {},
            } as WebsocketCategoriesMessage;

            await handleCategoryUpdatedEvent(serverUrl, msg);

            expect(fetchCategories).not.toHaveBeenCalled();
        });

        it('should handle missing updated categories data', async () => {
            const msg = {
                data: {},
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryUpdatedEvent(serverUrl, msg);

            expect(storeCategories).not.toHaveBeenCalled();
        });
    });

    describe('handleCategoryDeletedEvent', () => {
        it('should handle category deletion', async () => {
            const msg = {
                data: {
                    category_id: categoryId,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryDeletedEvent(serverUrl, msg);

            expect(deleteCategory).toHaveBeenCalledWith(serverUrl, categoryId);
            expect(fetchCategories).toHaveBeenCalledWith(serverUrl, teamId);
        });

        it('should handle missing category_id', async () => {
            const msg = {
                data: {},
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryDeletedEvent(serverUrl, msg);

            expect(deleteCategory).not.toHaveBeenCalled();
            expect(fetchCategories).toHaveBeenCalledWith(serverUrl, teamId);
        });
    });

    describe('handleCategoryOrderUpdatedEvent', () => {
        it('should handle empty order array', async () => {
            const msg = {
                data: {
                    order: [],
                    team_id: teamId,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as unknown as WebsocketCategoriesMessage;

            await handleCategoryOrderUpdatedEvent(serverUrl, msg);
            expect(batchRecords).not.toHaveBeenCalled();
        });

        it('should update category order', async () => {
            const mockCategories = [
                {id: 'cat1', prepareUpdate: jest.fn()},
                {id: 'cat2', prepareUpdate: jest.fn()},
            ];

            jest.mocked(queryCategoriesById).mockReturnValue({
                fetch: jest.fn().mockResolvedValue(mockCategories),
            } as any);

            const msg = {
                data: {
                    order: ['cat1', 'cat2'],
                    team_id: teamId,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryOrderUpdatedEvent(serverUrl, msg);

            expect(batchRecords).toHaveBeenCalled();
            mockCategories.forEach((cat) => {
                expect(cat.prepareUpdate).toHaveBeenCalled();
            });
        });

        it('should handle missing order data', async () => {
            const msg = {
                data: {
                    team_id: teamId,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryOrderUpdatedEvent(serverUrl, msg);

            expect(batchRecords).not.toHaveBeenCalled();
        });

        it('should handle database error', async () => {
            jest.mocked(queryCategoriesById).mockImplementation(() => {
                throw new Error('Database error');
            });

            const msg = {
                data: {
                    order: ['cat1', 'cat2'],
                    team_id: teamId,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebsocketCategoriesMessage;

            await handleCategoryOrderUpdatedEvent(serverUrl, msg);

            expect(fetchCategories).toHaveBeenCalledWith(serverUrl, teamId);
        });

        it('should handle database error - no team id', async () => {
            jest.mocked(queryCategoriesById).mockImplementation(() => {
                throw new Error('Database error');
            });

            const msg = {
                data: {
                    order: ['cat1', 'cat2'],
                    team_id: teamId,
                },
                broadcast: {},
            } as WebsocketCategoriesMessage;

            await handleCategoryOrderUpdatedEvent(serverUrl, msg);

            expect(fetchCategories).not.toHaveBeenCalledWith();
        });
    });
});
