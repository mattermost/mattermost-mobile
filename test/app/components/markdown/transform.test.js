// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import {Node, Parser} from 'commonmark';

import {
    addListItemIndices,
    pullOutImages,
} from 'app/components/markdown/transform';

describe('Components.Markdown.transform', () => {
    const parser = new Parser();

    describe('addListItemIndices', () => {
        it('unordered list', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'bullet',
                    listTight: true,
                    children: [{
                        type: 'item',
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'one',
                            }],
                        }],
                    }, {
                        type: 'item',
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'two',
                            }],
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'bullet',
                    listTight: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'one',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 2,
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'two',
                            }],
                        }],
                    }],
                }],
            });
            const actual = addListItemIndices(input);

            assert.ok(verifyAst(actual));
            assert.deepStrictEqual(actual, expected);
        });

        it('ordered list', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'bullet',
                    listTight: true,
                    listStart: 7,
                    listDelimiter: 'period',
                    children: [{
                        type: 'item',
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'one',
                            }],
                        }],
                    }, {
                        type: 'item',
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'two',
                            }],
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'bullet',
                    listTight: true,
                    listStart: 7,
                    listDelimiter: 'period',
                    children: [{
                        type: 'item',
                        index: 7,
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'one',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 8,
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'two',
                            }],
                        }],
                    }],
                }],
            });
            const actual = addListItemIndices(input);

            assert.ok(verifyAst(actual));
            assert.deepStrictEqual(actual, expected);
        });

        it('nested lists', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'bullet',
                    listTight: true,
                    listStart: 7,
                    listDelimiter: 'period',
                    children: [{
                        type: 'item',
                        children: [{
                            type: 'list',
                            listType: 'bullet',
                            listTight: true,
                            listStart: 3,
                            listDelimiter: 'period',
                            children: [{
                                type: 'item',
                                children: [{
                                    type: 'pargraph',
                                    children: [{
                                        type: 'text',
                                        literal: 'one',
                                    }],
                                }],
                            }, {
                                type: 'item',
                                children: [{
                                    type: 'list',
                                    listTight: true,
                                    children: [{
                                        type: 'item',
                                        children: [{
                                            type: 'pargraph',
                                            children: [{
                                                type: 'text',
                                                literal: 'one',
                                            }],
                                        }],
                                    }, {
                                        type: 'item',
                                        children: [{
                                            type: 'pargraph',
                                            children: [{
                                                type: 'text',
                                                literal: 'two',
                                            }],
                                        }],
                                    }],
                                }],
                            }],
                        }],
                    }, {
                        type: 'item',
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'two',
                            }],
                        }],
                    }],
                }, {
                    type: 'list',
                    listTight: true,
                    children: [{
                        type: 'item',
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'one',
                            }],
                        }],
                    }, {
                        type: 'item',
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'two',
                            }],
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'bullet',
                    listTight: true,
                    listStart: 7,
                    listDelimiter: 'period',
                    children: [{
                        type: 'item',
                        index: 7,
                        children: [{
                            type: 'list',
                            listType: 'bullet',
                            listTight: true,
                            listStart: 3,
                            listDelimiter: 'period',
                            children: [{
                                type: 'item',
                                index: 3,
                                children: [{
                                    type: 'pargraph',
                                    children: [{
                                        type: 'text',
                                        literal: 'one',
                                    }],
                                }],
                            }, {
                                type: 'item',
                                index: 4,
                                children: [{
                                    type: 'list',
                                    listTight: true,
                                    children: [{
                                        type: 'item',
                                        index: 1,
                                        children: [{
                                            type: 'pargraph',
                                            children: [{
                                                type: 'text',
                                                literal: 'one',
                                            }],
                                        }],
                                    }, {
                                        type: 'item',
                                        index: 2,
                                        children: [{
                                            type: 'pargraph',
                                            children: [{
                                                type: 'text',
                                                literal: 'two',
                                            }],
                                        }],
                                    }],
                                }],
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 8,
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'two',
                            }],
                        }],
                    }],
                }, {
                    type: 'list',
                    listTight: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'one',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 2,
                        children: [{
                            type: 'pargraph',
                            children: [{
                                type: 'text',
                                literal: 'two',
                            }],
                        }],
                    }],
                }],
            });
            const actual = addListItemIndices(input);

            assert.ok(verifyAst(actual));
            assert.deepStrictEqual(actual, expected);
        });
    });

    describe('pullOutImages', () => {
        it('simple example with no images', () => {
            const input = parser.parse('test');
            const expected = parser.parse('test');
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('complex example with no images', () => {
            const inputString = '- abc\n    1. def\n\n    2. ghi\n\n3. jkl\n- mno\n    1. pqr\n---\n# vwx\n\nyz';
            const input = parser.parse(inputString);
            const expected = parser.parse(inputString);
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('paragraph', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'paragraph',
                    children: [{
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'an image',
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'paragraph',
                    children: [],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('paragraph with surrounding text', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'paragraph',
                    children: [{
                        type: 'text',
                        literal: 'This is text with ',
                    }, {
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'an image',
                        }],
                    }, {
                        type: 'text',
                        literal: ' in it',
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'paragraph',
                    children: [{
                        type: 'text',
                        literal: 'This is text with ',
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'paragraph',
                    continue: true,
                    children: [{
                        type: 'text',
                        literal: 'in it', // Note that we remove the preceding whitespace
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('paragraph with multiple images', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'paragraph',
                    children: [{
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'an image',
                        }],
                    }, {
                        type: 'image',
                        destination: 'http://example.com/image2',
                        children: [{
                            type: 'text',
                            literal: 'another image',
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'paragraph',
                    children: [],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'paragraph',
                    continue: true,
                    children: [],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image2',
                    children: [{
                        type: 'text',
                        literal: 'another image',
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('headings', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'heading',
                    level: 1,
                    children: [{
                        type: 'text',
                        literal: 'This is the start 1',
                    }, {
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'an image 1',
                        }],
                    }],
                }, {
                    type: 'heading',
                    level: 4,
                    children: [{
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'an image 2',
                        }],
                    }, {
                        type: 'text',
                        literal: 'This is the end 2',
                    }],
                }, {
                    type: 'heading',
                    level: 2,
                    children: [{
                        type: 'text',
                        literal: 'This is the start 3',
                    }, {
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'an image 3',
                        }],
                    }, {
                        type: 'text',
                        literal: 'This is the end 3',
                    }],
                }, {
                    type: 'heading',
                    level: 3,
                    children: [{
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'an image 4a',
                        }],
                    }, {
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'an image 4b',
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'heading',
                    level: 1,
                    children: [{
                        type: 'text',
                        literal: 'This is the start 1',
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image 1',
                    }],
                }, {
                    type: 'heading',
                    level: 4,
                    children: [],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image 2',
                    }],
                }, {
                    type: 'heading',
                    level: 4,
                    continue: true,
                    children: [{
                        type: 'text',
                        literal: 'This is the end 2',
                    }],
                }, {
                    type: 'heading',
                    level: 2,
                    children: [{
                        type: 'text',
                        literal: 'This is the start 3',
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image 3',
                    }],
                }, {
                    type: 'heading',
                    level: 2,
                    continue: true,
                    children: [{
                        type: 'text',
                        literal: 'This is the end 3',
                    }],
                }, {
                    type: 'heading',
                    level: 3,
                    children: [],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image 4a',
                    }],
                }, {
                    type: 'heading',
                    level: 3,
                    continue: true,
                    children: [],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image 4b',
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('block quote', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'block_quote',
                    children: [{
                        type: 'paragraph',
                        children: [{
                            type: 'image',
                            destination: 'http://example.com/image',
                            children: [{
                                type: 'text',
                                literal: 'an image',
                            }],
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'block_quote',
                    children: [{
                        type: 'paragraph',
                        children: [],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('block quote with other text', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'block_quote',
                    children: [{
                        type: 'paragraph',
                        children: [{
                            type: 'text',
                            literal: 'This is ',
                        }, {
                            type: 'image',
                            destination: 'http://example.com/image',
                            children: [{
                                type: 'text',
                                literal: 'an image',
                            }],
                        }, {
                            type: 'text',
                            literal: ' in a sentence',
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'block_quote',
                    children: [{
                        type: 'paragraph',
                        children: [{
                            type: 'text',
                            literal: 'This is ',
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'block_quote',
                    continue: true,
                    children: [{
                        type: 'paragraph',
                        continue: true,
                        children: [{
                            type: 'text',
                            literal: 'in a sentence',
                        }],
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('unordered list', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'bullet',
                    listTight: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 2,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'an image',
                                }],
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 3,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is moretext',
                            }],
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'bullet',
                    listTight: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 2,
                        children: [{
                            type: 'paragraph',
                            children: [],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'list',
                    listType: 'bullet',
                    listTight: true,
                    continue: true,
                    children: [{
                        type: 'item',
                        index: 3,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is moretext',
                            }],
                        }],
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('ordered list', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'ordered',
                    listTight: false,
                    children: [{
                        type: 'item',
                        index: 7,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 8,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'an image',
                                }],
                            }],
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'ordered',
                    listTight: false,
                    children: [{
                        type: 'item',
                        index: 7,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 8,
                        children: [{
                            type: 'paragraph',
                            children: [],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('complicated list', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'ordered',
                    listTight: false,
                    children: [{
                        type: 'item',
                        index: 7,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 8,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }, {
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'an image',
                                }],
                            }, {
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'an image',
                                }],
                            }, {
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 9,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }, {
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 10,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'an image',
                                }],
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 11,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'ordered',
                    listTight: false,
                    children: [{
                        type: 'item',
                        index: 7,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 8,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'list',
                    listType: 'ordered',
                    listTight: false,
                    continue: true,
                    children: [{
                        type: 'item',
                        index: 8,
                        continue: true,
                        children: [{
                            type: 'paragraph',
                            continue: true,
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'list',
                    listType: 'ordered',
                    listTight: false,
                    continue: true,
                    children: [{
                        type: 'item',
                        index: 8,
                        continue: true,
                        children: [{
                            type: 'paragraph',
                            continue: true,
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 9,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }, {
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 10,
                        children: [{
                            type: 'paragraph',
                            children: [],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'list',
                    listType: 'ordered',
                    listTight: false,
                    continue: true,
                    children: [{
                        type: 'item',
                        index: 11,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'text',
                                literal: 'This is text',
                            }],
                        }],
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('nested lists', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'ordered',
                    listTight: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        children: [{
                            type: 'list',
                            listType: 'bulleted',
                            listTight: false,
                            children: [{
                                type: 'item',
                                index: 3,
                                children: [{
                                    type: 'paragraph',
                                    children: [{
                                        type: 'text',
                                        literal: 'This is text',
                                    }, {
                                        type: 'image',
                                        destination: 'http://example.com/image',
                                        children: [{
                                            type: 'text',
                                            literal: 'an image',
                                        }],
                                    }],
                                }],
                            }, {
                                type: 'item',
                                index: 4,
                                children: [{
                                    type: 'paragraph',
                                    children: [{
                                        type: 'image',
                                        destination: 'http://example.com/image',
                                        children: [{
                                            type: 'text',
                                            literal: 'an image',
                                        }],
                                    }, {
                                        type: 'text',
                                        literal: 'This is text',
                                    }],
                                }],
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 2,
                        children: [{
                            type: 'list',
                            listType: 'ordered',
                            listTight: true,
                            children: [{
                                type: 'item',
                                index: 1,
                                children: [{
                                    type: 'paragraph',
                                    children: [{
                                        type: 'image',
                                        destination: 'http://example.com/image',
                                        children: [{
                                            type: 'text',
                                            literal: 'an image',
                                        }],
                                    }, {
                                        type: 'text',
                                        literal: 'This is text',
                                    }],
                                }],
                            }, {
                                type: 'item',
                                index: 2,
                                children: [{
                                    type: 'paragraph',
                                    children: [{
                                        type: 'text',
                                        literal: 'This is text',
                                    }, {
                                        type: 'image',
                                        destination: 'http://example.com/image',
                                        children: [{
                                            type: 'text',
                                            literal: 'an image',
                                        }],
                                    }],
                                }],
                            }],
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'ordered',
                    listTight: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        children: [{
                            type: 'list',
                            listType: 'bulleted',
                            listTight: false,
                            children: [{
                                type: 'item',
                                index: 3,
                                children: [{
                                    type: 'paragraph',
                                    children: [{
                                        type: 'text',
                                        literal: 'This is text',
                                    }],
                                }],
                            }],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'list',
                    listType: 'ordered',
                    listTight: true,
                    continue: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        continue: true,
                        children: [{
                            type: 'list',
                            listType: 'bulleted',
                            listTight: false,
                            continue: true,
                            children: [{
                                type: 'item',
                                index: 4,
                                children: [{
                                    type: 'paragraph',
                                    children: [],
                                }],
                            }],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'list',
                    listType: 'ordered',
                    listTight: true,
                    continue: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        continue: true,
                        children: [{
                            type: 'list',
                            listType: 'bulleted',
                            listTight: false,
                            continue: true,
                            children: [{
                                type: 'item',
                                index: 4,
                                continue: true,
                                children: [{
                                    type: 'paragraph',
                                    continue: true,
                                    children: [{
                                        type: 'text',
                                        literal: 'This is text',
                                    }],
                                }],
                            }],
                        }],
                    }, {
                        type: 'item',
                        index: 2,
                        children: [{
                            type: 'list',
                            listType: 'ordered',
                            listTight: true,
                            children: [{
                                type: 'item',
                                index: 1,
                                children: [{
                                    type: 'paragraph',
                                    children: [],
                                }],
                            }],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'list',
                    listType: 'ordered',
                    listTight: true,
                    continue: true,
                    children: [{
                        type: 'item',
                        index: 2,
                        continue: true,
                        children: [{
                            type: 'list',
                            listType: 'ordered',
                            listTight: true,
                            continue: true,
                            children: [{
                                type: 'item',
                                index: 1,
                                continue: true,
                                children: [{
                                    type: 'paragraph',
                                    continue: true,
                                    children: [{
                                        type: 'text',
                                        literal: 'This is text',
                                    }],
                                }],
                            }, {
                                type: 'item',
                                index: 2,
                                children: [{
                                    type: 'paragraph',
                                    children: [{
                                        type: 'text',
                                        literal: 'This is text',
                                    }],
                                }],
                            }],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('complex example with images', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'bulleted',
                    listTight: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'image',
                                destination: 'http://example.com/abc',
                                children: [{
                                    type: 'text',
                                    literal: 'abc',
                                }],
                            }],
                        }, {
                            type: 'list',
                            listType: 'numbered',
                            listTight: false,
                            children: [{
                                type: 'item',
                                index: 1,
                                children: [{
                                    type: 'paragraph',
                                    children: [{
                                        type: 'image',
                                        destination: 'http://example.com/def',
                                        children: [{
                                            type: 'text',
                                            literal: 'def',
                                        }],
                                    }],
                                }],
                            }, {
                                type: 'item',
                                index: 2,
                                children: [{
                                    type: 'paragraph',
                                    children: [{
                                        type: 'image',
                                        destination: 'http://example.com/ghi',
                                        children: [{
                                            type: 'text',
                                            literal: 'ghi',
                                        }],
                                    }],
                                }],
                            }],
                        }],

                    }],
                }, {
                    type: 'list',
                    listType: 'ordered',
                    listTight: true,
                    children: [{
                        type: 'item',
                        index: 3,
                        children: [{
                            type: 'paragraph',
                            children: [{
                                type: 'image',
                                destination: 'http://example.com/jkl',
                                children: [{
                                    type: 'text',
                                    literal: 'jkl',
                                }],
                            }],
                        }],
                    }],
                }, {
                    type: 'block_quote',
                    children: [{
                        type: 'paragraph',
                        children: [{
                            type: 'image',
                            destination: 'http://example.com/mno',
                            children: [{
                                type: 'text',
                                literal: 'mno',
                            }],
                        }, {
                            type: 'softbreak',
                        }, {
                            type: 'image',
                            destination: 'http://example.com/pqr',
                            children: [{
                                type: 'text',
                                literal: 'pqr',
                            }],
                        }],
                    }],
                }, {
                    type: 'thematic_break',
                }, {
                    type: 'heading',
                    level: 1,
                    children: [{
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'vw',
                        }],
                    }, {
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'x',
                        }],
                    }],
                }, {
                    type: 'paragraph',
                    children: [{
                        type: 'image',
                        destination: 'http://example.com/image',
                        children: [{
                            type: 'text',
                            literal: 'yz',
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'list',
                    listType: 'bulleted',
                    listTight: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        children: [{
                            type: 'paragraph',
                            children: [],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/abc',
                    children: [{
                        type: 'text',
                        literal: 'abc',
                    }],
                }, {
                    type: 'list',
                    listType: 'bulleted',
                    listTight: true,
                    continue: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        continue: true,
                        children: [{
                            type: 'list',
                            listType: 'numbered',
                            listTight: false,
                            children: [{
                                type: 'item',
                                index: 1,
                                children: [{
                                    type: 'paragraph',
                                    children: [],
                                }],
                            }],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/def',
                    children: [{
                        type: 'text',
                        literal: 'def',
                    }],
                }, {
                    type: 'list',
                    listType: 'bulleted',
                    listTight: true,
                    continue: true,
                    children: [{
                        type: 'item',
                        index: 1,
                        continue: true,
                        children: [{
                            type: 'list',
                            listType: 'numbered',
                            listTight: false,
                            continue: true,
                            children: [{
                                type: 'item',
                                index: 2,
                                children: [{
                                    type: 'paragraph',
                                    children: [],
                                }],
                            }],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/ghi',
                    children: [{
                        type: 'text',
                        literal: 'ghi',
                    }],
                }, {
                    type: 'list',
                    listType: 'ordered',
                    listTight: true,
                    children: [{
                        type: 'item',
                        index: 3,
                        children: [{
                            type: 'paragraph',
                            children: [],
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/jkl',
                    children: [{
                        type: 'text',
                        literal: 'jkl',
                    }],
                }, {
                    type: 'block_quote',
                    children: [{
                        type: 'paragraph',
                        children: [],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/mno',
                    children: [{
                        type: 'text',
                        literal: 'mno',
                    }],
                }, {
                    type: 'block_quote',
                    continue: true,
                    children: [{
                        type: 'paragraph',
                        continue: true,
                        children: [{
                            type: 'softbreak',
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/pqr',
                    children: [{
                        type: 'text',
                        literal: 'pqr',
                    }],
                }, {
                    type: 'thematic_break',
                }, {
                    type: 'heading',
                    level: 1,
                    children: [],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'vw',
                    }],
                }, {
                    type: 'heading',
                    level: 1,
                    continue: true,
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'x',
                    }],
                }, {
                    type: 'paragraph',
                    children: [],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    children: [{
                        type: 'text',
                        literal: 'yz',
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('simple link', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'paragraph',
                    children: [{
                        type: 'link',
                        destination: 'http://example.com',
                        children: [{
                            type: 'image',
                            destination: 'http://example.com/image',
                            children: [{
                                type: 'text',
                                literal: 'an image',
                            }],
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'paragraph',
                    children: [{
                        type: 'link',
                        destination: 'http://example.com',
                        children: [],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    linkDestination: 'http://example.com',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('link in sentence', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'paragraph',
                    children: [{
                        type: 'link',
                        destination: 'http://example.com',
                        children: [{
                            type: 'text',
                            literal: 'This is ',
                        }, {
                            type: 'image',
                            destination: 'http://example.com/image',
                            children: [{
                                type: 'text',
                                literal: 'an image',
                            }],
                        }, {
                            type: 'text',
                            literal: ' in a sentence.',
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'paragraph',
                    children: [{
                        type: 'link',
                        destination: 'http://example.com',
                        children: [{
                            type: 'text',
                            literal: 'This is ',
                        }],
                    }],
                }, {
                    type: 'image',
                    destination: 'http://example.com/image',
                    linkDestination: 'http://example.com',
                    children: [{
                        type: 'text',
                        literal: 'an image',
                    }],
                }, {
                    type: 'paragraph',
                    continue: true,
                    children: [{
                        type: 'link',
                        destination: 'http://example.com',
                        continue: true,
                        children: [{
                            type: 'text',
                            literal: 'in a sentence.',
                        }],
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });

        it('table', () => {
            const input = makeAst({
                type: 'document',
                children: [{
                    type: 'table',
                    children: [{
                        type: 'table_row',
                        isHeading: true,
                        children: [{
                            type: 'table_cell',
                            isHeading: true,
                            children: [{
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'image1',
                                }],
                            }],
                        }, {
                            type: 'table_cell',
                            isHeading: true,
                            children: [{
                                type: 'text',
                                literal: 'This is ',
                            }, {
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'image1',
                                }],
                            }, {
                                type: 'text',
                                literal: ' in a sentence.',
                            }],
                        }],
                    }, {
                        type: 'table_row',
                        isHeading: true,
                        children: [{
                            type: 'table_cell',
                            isHeading: true,
                            children: [{
                                type: 'text',
                                literal: 'This is ',
                            }, {
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'image1',
                                }],
                            }, {
                                type: 'text',
                                literal: ' in a sentence.',
                            }],
                        }, {
                            type: 'table_cell',
                            isHeading: true,
                            children: [{
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'image1',
                                }],
                            }],
                        }],
                    }],
                }],
            });
            const expected = makeAst({
                type: 'document',
                children: [{
                    type: 'table',
                    children: [{
                        type: 'table_row',
                        isHeading: true,
                        children: [{
                            type: 'table_cell',
                            isHeading: true,
                            children: [{
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'image1',
                                }],
                            }],
                        }, {
                            type: 'table_cell',
                            isHeading: true,
                            children: [{
                                type: 'text',
                                literal: 'This is ',
                            }, {
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'image1',
                                }],
                            }, {
                                type: 'text',
                                literal: ' in a sentence.',
                            }],
                        }],
                    }, {
                        type: 'table_row',
                        isHeading: true,
                        children: [{
                            type: 'table_cell',
                            isHeading: true,
                            children: [{
                                type: 'text',
                                literal: 'This is ',
                            }, {
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'image1',
                                }],
                            }, {
                                type: 'text',
                                literal: ' in a sentence.',
                            }],
                        }, {
                            type: 'table_cell',
                            isHeading: true,
                            children: [{
                                type: 'image',
                                destination: 'http://example.com/image',
                                children: [{
                                    type: 'text',
                                    literal: 'image1',
                                }],
                            }],
                        }],
                    }],
                }],
            });
            const actual = pullOutImages(input);

            assert.ok(verifyAst(actual));
            assert.equal(astToString(actual), astToString(expected));
            assert.deepStrictEqual(actual, expected);
        });
    });
});

// Testing and debugging functions

function verifyAst(node) {
    if (node.prev && node.prev.next !== node) {
        console.error('node is not linked properly to prev');
    }

    if (node.next && node.next.prev !== node) {
        console.error('node is not linked properly to prev');
    }

    for (let child = node.firstChild; child; child = child.next) {
        if (child.parent !== node) {
            console.error('node is not linked properly to child');
        }
    }

    if (node.firstChild && node.firstChild.prev) {
        console.error('node\'s first child has previous sibling');
    }

    if (node.lastChild && node.lastChild.next) {
        console.error('node\'s last child has next sibling');
    }

    return true;
}

function astToString(node, indent = '') { // eslint-disable-line no-unused-vars
    if (!node) {
        return '';
    }

    let out = '';

    out += indent + nodeToString(node) + '\n';

    for (let child = node.firstChild; child !== null; child = child.next) {
        out += astToString(child, indent + '  ');
    }

    return out;
}

const neighbours = ['parent', 'prev', 'next', 'firstChild', 'lastChild'];
const importantFields = ['literal', 'destination', 'title', 'level', 'listType', 'listTight', 'listDelimiter', 'mentionName', 'channelName', 'emojiName', 'continue', 'index'];
function nodeToString(node) {
    let out = node.type;

    for (const neighbour of neighbours) {
        if (node[neighbour]) {
            out += ' ' + neighbour + '=`' + node[neighbour].type;
            if (node[neighbour].type === 'text') {
                out += ':' + node[neighbour].literal;
            }
            out += '`';
        }
    }

    for (const field of importantFields) {
        if (node[field]) {
            out += ' ' + field + '=`' + node[field] + '`';
        }
    }

    return out;
}

const ignoredKeys = {_sourcepos: true, _lastLineBlank: true, _open: true, _string_content: true, _info: true, _isFenced: true, _fenceChar: true, _fenceLength: true, _fenceOffset: true, _onEnter: true, _onExit: true};
function astToJson(node, visited = [], indent = '') { // eslint-disable-line no-unused-vars
    let out = '{';

    const myVisited = [...visited];
    myVisited.push(node);

    const keys = Object.keys(node).filter((key) => !ignoredKeys[key]);
    if (keys.length > 0) {
        out += '\n';
    }

    for (const [i, key] of keys.entries()) {
        out += indent + '  "' + key + '":';

        const value = node[key];
        if (myVisited.indexOf(value) !== -1) {
            out += '[Circular]';
        } else if (value === null) {
            out += 'null';
        } else if (typeof value === 'number') {
            out += value;
        } else if (typeof value === 'string') {
            out += '"' + value + '"';
        } else if (typeof value === 'boolean') {
            out += String(value);
        } else if (typeof value === 'object') {
            out += astToJson(value, myVisited, indent + '  ');
        }

        if (i !== keys.length - 1) {
            out += ',\n';
        }
    }

    if (keys.length > 0) {
        out += '\n' + indent;
    }

    out += '}';

    return out;
}

// Converts an AST represented as a JavaScript object into a full Commonmark-compatitle AST.
// This function is intended for use while testing. An example of input would be:
// {
//     type: 'document',
//     children: [{
//         type: 'heading',
//         level: 2,
//         children: [{
//             type: 'text',
//             literal: 'This is a heading'
//         }]
//     }, {
//         type: 'paragraph',
//         children: [{
//             type: 'text',
//             literal: 'This is a paragraph'
//         }]
//     }]
// }
function makeAst(input) {
    const {type, children, ...other} = input;

    const node = new Node(type);

    for (const key of Object.keys(other)) {
        node[key] = other[key];
    }

    if (children) {
        for (const child of children) {
            node.appendChild(makeAst(child));
        }
    }

    return node;
}
