// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import {observeAllowPdfLinkNavigation, observeCanDownloadFiles, observeCanUploadFiles, observeEnableSecureFilePreview} from './security';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

describe('observeCanUploadFiles', () => {
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });
    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return true if no file attachment config value', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableMobileFileUpload', value: 'true'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            observeCanUploadFiles(database).subscribe((data) => {
                if (data === true) {
                    done();
                } else {
                    done.fail();
                }
            });
        });
    }, 1500);

    it('should return false if file attachment config value is false', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableFileAttachments', value: 'false'}, {id: 'EnableMobileFileUpload', value: 'true'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            observeCanUploadFiles(database).subscribe((data) => {
                if (data === false) {
                    done();
                } else {
                    done.fail();
                }
            });
        });
    }, 1500);

    it('should return true if file attachment config value is true and there is no license', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableFileAttachments', value: 'true'}, {id: 'EnableMobileFileUpload', value: 'false'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            observeCanUploadFiles(database).subscribe((data) => {
                if (data === true) {
                    done();
                } else {
                    done.fail();
                }
            });
        });
    }, 1500);

    it('should return true if file attachment config value is true and server is not licensed', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableFileAttachments', value: 'true'}, {id: 'EnableMobileFileUpload', value: 'false'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {isLicensed: false}}], prepareRecordsOnly: false}).then(() => {
                observeCanUploadFiles(database).subscribe((data) => {
                    if (data === true) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return true if file attachment config value is true and server is licensed, but no compliance is set', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableFileAttachments', value: 'true'}, {id: 'EnableMobileFileUpload', value: 'false'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeCanUploadFiles(database).subscribe((data) => {
                    if (data === true) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return true if file attachment config value is true and server is licensed, but compliance is set to false', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableFileAttachments', value: 'true'}, {id: 'EnableMobileFileUpload', value: 'false'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', Compliance: 'false'}}], prepareRecordsOnly: false}).then(() => {
                observeCanUploadFiles(database).subscribe((data) => {
                    if (data === true) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return true if file attachment config value is true and server is licensed and compliance is set to true, but EnableMobileFileUpload is not set', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableFileAttachments', value: 'true'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', Compliance: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeCanUploadFiles(database).subscribe((data) => {
                    if (data === true) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return false if file attachment config value is true and server is licensed and compliance is set to true, but EnableMobileFileUpload is set to false', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableFileAttachments', value: 'true'}, {id: 'EnableMobileFileUpload', value: 'false'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', Compliance: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeCanUploadFiles(database).subscribe((data) => {
                    if (data === false) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return true if file attachment config value is true and server is licensed and compliance is set to true, but EnableMobileFileUpload is set to true', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableFileAttachments', value: 'true'}, {id: 'EnableMobileFileUpload', value: 'true'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', Compliance: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeCanUploadFiles(database).subscribe((data) => {
                    if (data === true) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);
});

describe('observeCanDownloadFiles', () => {
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });
    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return true if there is no license', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableMobileFileDownload', value: 'false'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            observeCanDownloadFiles(database).subscribe((data) => {
                if (data === true) {
                    done();
                } else {
                    done.fail();
                }
            });
        });
    }, 1500);

    it('should return true if server is not licensed', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableMobileFileDownload', value: 'false'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {isLicensed: false}}], prepareRecordsOnly: false}).then(() => {
                observeCanDownloadFiles(database).subscribe((data) => {
                    if (data === true) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return true if server is licensed, but no compliance is set', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableMobileFileDownload', value: 'false'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeCanDownloadFiles(database).subscribe((data) => {
                    if (data === true) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return true if server is licensed, but compliance is set to false', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableMobileFileDownload', value: 'false'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', Compliance: 'false'}}], prepareRecordsOnly: false}).then(() => {
                observeCanDownloadFiles(database).subscribe((data) => {
                    if (data === true) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return true if is licensed and compliance is set to true, but EnableMobileFileDownload is not set', (done) => {
        operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', Compliance: 'true'}}], prepareRecordsOnly: false}).then(() => {
            observeCanDownloadFiles(database).subscribe((data) => {
                if (data === true) {
                    done();
                } else {
                    done.fail();
                }
            });
        });
    }, 1500);

    it('should return false if server is licensed and compliance is set to true, but EnableMobileFileDownload is set to false', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableMobileFileDownload', value: 'false'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', Compliance: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeCanDownloadFiles(database).subscribe((data) => {
                    if (data === false) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return true if server is licensed and compliance is set to true, but EnableMobileFileDownload is set to true', (done) => {
        operator.handleConfigs({configs: [{id: 'EnableMobileFileDownload', value: 'true'}], prepareRecordsOnly: false, configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', Compliance: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeCanDownloadFiles(database).subscribe((data) => {
                    if (data === true) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);
});

describe('observeEnableSecureFilePreview', () => {
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return false if MobileEnableSecureFilePreview is false and license tier is below EnterpriseAdvanced', (done) => {
        operator.handleConfigs({configs: [
            {id: 'MobileEnableSecureFilePreview', value: 'false'},
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {SkuShortName: License.SKU_SHORT_NAME.Professional, IsLicensed: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeEnableSecureFilePreview(database).subscribe((data) => {
                    if (data === false) {
                        done();
                    }
                });
            });
        });
    }, 1500);

    it('should return true if MobileEnableSecureFilePreview is true and license tier is EnterpriseAdvanced', (done) => {
        operator.handleConfigs({configs: [
            {id: 'MobileEnableSecureFilePreview', value: 'true'},
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced, IsLicensed: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeEnableSecureFilePreview(database).subscribe((data) => {
                    console.log('data', data);
                    if (data === true) {
                        done();
                    }
                });
            });
        });
    }, 1500);

    it('should return false if MobileEnableSecureFilePreview is false even if license tier is EnterpriseAdvanced', (done) => {
        operator.handleConfigs({configs: [
            {id: 'MobileEnableSecureFilePreview', value: 'false'},
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced, IsLicensed: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeEnableSecureFilePreview(database).subscribe((data) => {
                    if (data === false) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return false if MobileEnableSecureFilePreview is true but license tier is below EnterpriseAdvanced', (done) => {
        operator.handleConfigs({configs: [
            {id: 'MobileEnableSecureFilePreview', value: 'true'},
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {SkuShortName: License.SKU_SHORT_NAME.Professional, IsLicensed: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeEnableSecureFilePreview(database).subscribe((data) => {
                    if (data === false) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);
});

describe('observeAllowPdfLinkNavigation', () => {
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return false if MobileAllowPdfLinkNavigation is false and license tier is below EnterpriseAdvanced', (done) => {
        operator.handleConfigs({configs: [
            {id: 'MobileAllowPdfLinkNavigation', value: 'false'},
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {SkuShortName: License.SKU_SHORT_NAME.Professional, IsLicensed: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeAllowPdfLinkNavigation(database).subscribe((data) => {
                    if (data === false) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return true if MobileAllowPdfLinkNavigation is true and license tier is EnterpriseAdvanced', (done) => {
        operator.handleConfigs({configs: [
            {id: 'MobileAllowPdfLinkNavigation', value: 'true'},
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced, IsLicensed: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeAllowPdfLinkNavigation(database).subscribe((data) => {
                    if (data === true) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return false if MobileAllowPdfLinkNavigation is false even if license tier is EnterpriseAdvanced', (done) => {
        operator.handleConfigs({configs: [
            {id: 'MobileAllowPdfLinkNavigation', value: 'false'},
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced, IsLicensed: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeAllowPdfLinkNavigation(database).subscribe((data) => {
                    if (data === false) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);

    it('should return false if MobileAllowPdfLinkNavigation is true but license tier is below EnterpriseAdvanced', (done) => {
        operator.handleConfigs({configs: [
            {id: 'MobileAllowPdfLinkNavigation', value: 'true'},
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {SkuShortName: License.SKU_SHORT_NAME.Professional, IsLicensed: 'true'}}], prepareRecordsOnly: false}).then(() => {
                observeAllowPdfLinkNavigation(database).subscribe((data) => {
                    if (data === false) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        });
    }, 1500);
});
