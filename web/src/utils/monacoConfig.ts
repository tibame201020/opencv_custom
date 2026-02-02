let isRegistered = false;

export const registerPythonCompletions = (monaco: any) => {
    if (isRegistered) return;
    isRegistered = true;

    monaco.languages.registerCompletionItemProvider('python', {
        triggerCharacters: ['.', '('],
        provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const lineContent = model.getLineContent(position.lineNumber);
            const prefix = lineContent.substring(0, position.column - 1);

            // 1. self.platform completions
            if (prefix.trim().endsWith('self.platform.')) {
                return {
                    suggestions: [
                        {
                            label: 'click',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'click(${1:x}, ${2:y}, self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(x, y, device_id)',
                            documentation: 'Click at coordinates',
                            range: range
                        },
                        {
                            label: 'click_image',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'click_image(f"{self.image_root}/${1:image.png}", OcrRegion(${2:0}, ${3:0}, ${4:100}, ${5:100}), self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(image_path, region, device_id)',
                            documentation: 'Click on found image in region',
                            range: range
                        },
                        {
                            label: 'click_image_full',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'click_image_full(f"{self.image_root}/${1:image.png}", self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(image_path, device_id)',
                            documentation: 'Click on found image (full screen)',
                            range: range
                        },
                        {
                            label: 'find_image_full',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'find_image_full(f"{self.image_root}/${1:image.png}", self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(image_path, device_id)',
                            documentation: 'Find image on screen',
                            range: range
                        },
                        {
                            label: 'swipe',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'swipe(${1:x1}, ${2:y1}, ${3:x2}, ${4:y2}, self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(x1, y1, x2, y2, device_id)',
                            documentation: 'Swipe from (x1,y1) to (x2,y2)',
                            range: range
                        },
                        {
                            label: 'swipe_with_duration',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'swipe_with_duration(${1:x1}, ${2:y1}, ${3:x2}, ${4:y2}, ${5:duration_ms}, self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(x1, y1, x2, y2, duration, device_id)',
                            documentation: 'Swipe with duration',
                            range: range
                        },
                        {
                            label: 'type_text',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'type_text("${1:text}", self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(text, device_id)',
                            documentation: 'Input text',
                            range: range
                        },
                        {
                            label: 'key_event',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'key_event("KEYCODE_${1:HOME}", self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(keycode, device_id)',
                            documentation: 'Send key event',
                            range: range
                        },
                        {
                            label: 'start_app',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'start_app("${1:package_name}", self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(package, device_id)',
                            documentation: 'Start application',
                            range: range
                        },
                        {
                            label: 'stop_app',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'stop_app("${1:package_name}", self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(package, device_id)',
                            documentation: 'Stop application',
                            range: range
                        },
                        {
                            label: 'take_snapshot',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'take_snapshot(self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(device_id)',
                            documentation: 'Take screenshot as Mat',
                            range: range
                        },
                        {
                            label: 'connect',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'connect(self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(device_id)',
                            documentation: 'Connect to device',
                            range: range
                        },
                        {
                            label: 'drag',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'drag(${1:x1}, ${2:y1}, ${3:x2}, ${4:y2}, self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(x1, y1, x2, y2, device_id)',
                            documentation: 'Drag from (x1,y1) to (x2,y2)',
                            range: range
                        },
                        {
                            label: 'pull',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'pull("${1:android_path}", "${2:disk_path}", self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(android_path, disk_path, device_id)',
                            documentation: 'Pull file from device',
                            range: range
                        },
                        {
                            label: 'push',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'push("${1:disk_path}", "${2:android_path}", self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(disk_path, android_path, device_id)',
                            documentation: 'Push file to device',
                            range: range
                        },
                        {
                            label: 'find_image_with_similar',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'find_image_with_similar(f"{self.image_root}/${1:image.png}", ${2:0.9}, self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(image_path, similarity, device_id)',
                            documentation: 'Find image with specific similarity',
                            range: range
                        },
                        {
                            label: 'click_image_with_similar',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'click_image_with_similar(f"{self.image_root}/${1:image.png}", ${2:0.9}, self.deviceId)',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: '(image_path, similarity, device_id)',
                            documentation: 'Click image with specific similarity',
                            range: range
                        }
                    ]
                };
            }

            // 2. Global completions (Context aware + Python Standards)
            const pythonKeywords = [
                'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
                'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
                'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
                'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'
            ];

            const pythonBuiltins = [
                'abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'bytes', 'callable',
                'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir',
                'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float', 'format',
                'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex',
                'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len', 'list',
                'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object', 'oct',
                'open', 'ord', 'pow', 'print', 'property', 'range', 'repr', 'reversed',
                'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str',
                'sum', 'super', 'tuple', 'type', 'vars', 'zip'
            ];

            const keywordSuggestions = pythonKeywords.map(key => ({
                label: key,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: key,
                range: range
            }));

            const builtinSuggestions = pythonBuiltins.map(func => ({
                label: func,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: func,
                documentation: `Built-in function ${func}`,
                range: range
            }));

            const snippetSuggestions = [
                {
                    label: 'if',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'if ${1:condition}:',
                        '\t${2:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'If statement',
                    range: range
                },
                {
                    label: 'ifelse',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'if ${1:condition}:',
                        '\t${2:pass}',
                        'else:',
                        '\t${3:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'If-Else statement',
                    range: range
                },
                {
                    label: 'def',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'def ${1:function_name}(${2:args}):',
                        '\t"""${3:docstring}"""',
                        '\t${4:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Function definition',
                    range: range
                },
                {
                    label: 'for',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'for ${1:item} in ${2:iterable}:',
                        '\t${3:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'For loop',
                    range: range
                },
                {
                    label: 'try',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'try:',
                        '\t${1:pass}',
                        'except ${2:Exception} as ${3:e}:',
                        '\t${4:raise e}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Try-Except block',
                    range: range
                },
                {
                    label: 'class',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'class ${1:ClassName}:',
                        '\tdef __init__(self, ${2:args}):',
                        '\t\t${3:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Class definition',
                    range: range
                },
                {
                    label: 'main',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'if __name__ == "__main__":',
                        '\t${1:main()}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Main block',
                    range: range
                }
            ];

            const customSuggestions = [
                {
                    label: 'self.platform',
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: 'self.platform',
                    documentation: 'Access platform specific commands',
                    range: range
                },
                {
                    label: 'self.deviceId',
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: 'self.deviceId',
                    documentation: 'Current device ID',
                    range: range
                },
                {
                    label: 'self.image_root',
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: 'self.image_root',
                    documentation: 'Root path for script images',
                    range: range
                },
                {
                    label: 'OcrRegion',
                    kind: monaco.languages.CompletionItemKind.Class,
                    insertText: 'OcrRegion(${1:x}, ${2:y}, ${3:w}, ${4:h})',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'OcrRegion(x, y, w, h)',
                    documentation: 'Define a region for OCR/Image search',
                    range: range
                },
                {
                    label: 'loop',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'while True:',
                        '\t${1:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Infinite loop',
                    range: range
                },
                {
                    label: 'find_and_click',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'found, point = self.platform.find_image_full(f"{self.image_root}/${1:target.png}", self.deviceId)',
                        'if found:',
                        '\tself.platform.click(point[0], point[1], self.deviceId)'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Pattern to find an image and click it if found',
                    range: range
                },
                {
                    label: 'sleep',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'time.sleep(${1:1})',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Sleep for seconds',
                    range: range
                },
                {
                    label: 'print',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'print(f"${1:message}")',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Print formatted string',
                    range: range
                }
            ];

            return {
                suggestions: [
                    ...keywordSuggestions,
                    ...builtinSuggestions,
                    ...snippetSuggestions,
                    ...customSuggestions
                ]
            };
        }
    });

    // 3. Hover Provider
    monaco.languages.registerHoverProvider('python', {
        provideHover: (model: any, position: any) => {
            const word = model.getWordAtPosition(position);
            if (!word) return null;

            const lineContent = model.getLineContent(position.lineNumber);
            const isPlatformMethod = lineContent.substring(0, word.startColumn - 1).trim().endsWith('self.platform.');

            if (isPlatformMethod && platformDocs[word.word]) {
                const doc = platformDocs[word.word];
                return {
                    range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                    contents: [
                        { value: `**${word.word}**` },
                        { value: `\`${doc.signature}\`` },
                        { value: doc.description }
                    ]
                };
            }
            return null;
        }
    });
};

const platformDocs: Record<string, { signature: string, description: string }> = {
    click: {
        signature: 'click(x, y, device_id=None)',
        description: 'Sends a click event to the specified coordinates.'
    },
    click_image: {
        signature: 'click_image(image_path, region, device_id=None)',
        description: 'Finds an image within a specific region and clicks its center.'
    },
    click_image_full: {
        signature: 'click_image_full(image_path, device_id=None)',
        description: 'Finds an image on the full screen and clicks its center.'
    },
    find_image_full: {
        signature: 'find_image_full(image_path, device_id=None)',
        description: 'Searches for an image on the screen. Returns (found: bool, point: tuple).'
    },
    swipe: {
        signature: 'swipe(x1, y1, x2, y2, device_id=None)',
        description: 'Performs a swipe gesture from start to end coordinates.'
    },
    type_text: {
        signature: 'type_text(text, device_id=None)',
        description: 'Simulates typing text on the device.'
    },
    key_event: {
        signature: 'key_event(keycode, device_id=None)',
        description: 'Sends a hardware key event (e.g., KEYCODE_HOME).'
    },
    start_app: {
        signature: 'start_app(package, device_id=None)',
        description: 'Launches an application by its package name.'
    },
    take_snapshot: {
        signature: 'take_snapshot(device_id=None)',
        description: 'Takes a screenshot and returns it as a Mat object.'
    },
    drag: {
        signature: 'drag(x1, y1, x2, y2, device_id=None)',
        description: 'Performs a drag gesture from start to end (default 1000ms).'
    },
    pull: {
        signature: 'pull(android_path, disk_path, device_id=None)',
        description: 'Downloads a file from the device to the local machine.'
    },
    push: {
        signature: 'push(disk_path, android_path, device_id=None)',
        description: 'Uploads a file from the local machine to the device.'
    }
};
