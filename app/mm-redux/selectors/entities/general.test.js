// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import * as Selectors from '@mm-redux/selectors/entities/general';

import {General} from '../../constants';

describe('Selectors.General', () => {
    it('canUploadFilesOnMobile', () => {
        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), true);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableFileAttachments: 'false',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), false);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableFileAttachments: 'true',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), true);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableMobileFileUpload: 'false',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), false);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableFileAttachments: 'false',
                        EnableMobileFileUpload: 'false',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), false);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableFileAttachments: 'true',
                        EnableMobileFileUpload: 'false',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), false);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableMobileFileUpload: 'true',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), true);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableFileAttachments: 'false',
                        EnableMobileFileUpload: 'true',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), false);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableFileAttachments: 'true',
                        EnableMobileFileUpload: 'true',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), true);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableFileAttachments: 'false',
                    },
                    license: {
                        IsLicensed: 'false',
                        Compliance: 'false',
                    },
                },
            },
        }), false);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableFileAttachments: 'true',
                        EnableMobileFileUpload: 'false',
                    },
                    license: {
                        IsLicensed: 'false',
                        Compliance: 'false',
                    },
                },
            },
        }), true);

        assert.equal(Selectors.canUploadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableFileAttachments: 'true',
                        EnableMobileFileUpload: 'false',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'false',
                    },
                },
            },
        }), true);
    });

    it('canDownloadFilesOnMobile', () => {
        assert.equal(Selectors.canDownloadFilesOnMobile({
            entities: {
                general: {
                    config: {
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), true);

        assert.equal(Selectors.canDownloadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableMobileFileDownload: 'false',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true,',
                    },
                },
            },
        }), false);

        assert.equal(Selectors.canDownloadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableMobileFileDownload: 'true',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'true',
                    },
                },
            },
        }), true);

        assert.equal(Selectors.canDownloadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableMobileFileDownload: 'false',
                    },
                    license: {
                        IsLicensed: 'false',
                        Compliance: 'false',
                    },
                },
            },
        }), true);

        assert.equal(Selectors.canDownloadFilesOnMobile({
            entities: {
                general: {
                    config: {
                        EnableMobileFileDownload: 'false',
                    },
                    license: {
                        IsLicensed: 'true',
                        Compliance: 'false',
                    },
                },
            },
        }), true);
    });

    describe('getAutolinkedUrlSchemes', () => {
        it('setting doesn\'t exist', () => {
            const state = {
                entities: {
                    general: {
                        config: {
                        },
                    },
                },
            };

            assert.deepEqual(Selectors.getAutolinkedUrlSchemes(state), General.DEFAULT_AUTOLINKED_URL_SCHEMES);
            assert.equal(Selectors.getAutolinkedUrlSchemes(state), Selectors.getAutolinkedUrlSchemes(state));
        });

        it('no custom url schemes', () => {
            const state = {
                entities: {
                    general: {
                        config: {
                            CustomUrlSchemes: '',
                        },
                    },
                },
            };

            assert.deepEqual(Selectors.getAutolinkedUrlSchemes(state), General.DEFAULT_AUTOLINKED_URL_SCHEMES);
            assert.equal(Selectors.getAutolinkedUrlSchemes(state), Selectors.getAutolinkedUrlSchemes(state));
        });

        it('one custom url scheme', () => {
            const state = {
                entities: {
                    general: {
                        config: {
                            CustomUrlSchemes: 'dns',
                        },
                    },
                },
            };

            assert.deepEqual(Selectors.getAutolinkedUrlSchemes(state), [...General.DEFAULT_AUTOLINKED_URL_SCHEMES, 'dns']);
            assert.equal(Selectors.getAutolinkedUrlSchemes(state), Selectors.getAutolinkedUrlSchemes(state));
        });

        it('multiple custom url schemes', () => {
            const state = {
                entities: {
                    general: {
                        config: {
                            CustomUrlSchemes: 'dns,steam,shttp',
                        },
                    },
                },
            };

            assert.deepEqual(Selectors.getAutolinkedUrlSchemes(state), [...General.DEFAULT_AUTOLINKED_URL_SCHEMES, 'dns', 'steam', 'shttp']);
            assert.equal(Selectors.getAutolinkedUrlSchemes(state), Selectors.getAutolinkedUrlSchemes(state));
        });
    });
});

