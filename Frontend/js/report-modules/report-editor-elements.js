/**
 * Report Editor Elements Module
 * 
 * Provides functionality for adding and managing text blocks, tables, and other elements
 */

/**
 * Add a text block to the report
 * @param {HTMLElement} dropZone - The drop zone element
 */
function addTextBlockToReport(dropZone) {
    // Create a unique ID for this text block instance
    const textBlockId = `text-block-${Date.now()}`;
    
    // Add text block to the configuration
    const textBlockConfig = {
        id: textBlockId,
        type: 'text',
        content: 'Enter your text here...',
        style: {
            fontSize: '14px',
            textAlign: 'left'
        }
    };
    
    currentTemplate.configuration.textBlocks = currentTemplate.configuration.textBlocks || [];
    currentTemplate.configuration.textBlocks.push(textBlockConfig);
    
    // Create text block element
    const textBlockElement = document.createElement('div');
    textBlockElement.id = textBlockId;
    textBlockElement.className = 'relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4';
    textBlockElement.setAttribute('data-element-type', 'text');
    textBlockElement.setAttribute('data-instance-id', textBlockId);
    
    textBlockElement.innerHTML = `
        <div class="absolute top-2 right-2 flex space-x-2">
            <button class="text-gray-400 hover:text-blue-500 edit-text" data-instance-id="${textBlockId}">
                <i class="ri-edit-line"></i>
            </button>
            <button class="text-gray-400 hover:text-red-500 delete-text" data-instance-id="${textBlockId}">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
        <div class="text-content pt-6">
            <p>Enter your text here...</p>
        </div>
    `;
    
    // Add text block to drop zone
    dropZone.appendChild(textBlockElement);
    
    // Make text block draggable
    makeTextBlockDraggable(textBlockElement);
    
    // Add event listeners for text block controls
    addTextBlockEventListeners(textBlockElement);
}

/**
 * Make a text block element draggable
 * @param {HTMLElement} textBlockElement - The text block element
 */
function makeTextBlockDraggable(textBlockElement) {
    textBlockElement.setAttribute('draggable', 'true');
    
    textBlockElement.addEventListener('dragstart', (e) => {
        const instanceId = textBlockElement.getAttribute('data-instance-id');
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            elementType: 'text',
            elementId: instanceId,
            isNew: false
        }));
        
        textBlockElement.classList.add('opacity-50');
    });
    
    textBlockElement.addEventListener('dragend', () => {
        textBlockElement.classList.remove('opacity-50');
    });
}

/**
 * Add event listeners for text block controls
 * @param {HTMLElement} textBlockElement - The text block element
 */
function addTextBlockEventListeners(textBlockElement) {
    const editButton = textBlockElement.querySelector('.edit-text');
    const deleteButton = textBlockElement.querySelector('.delete-text');
    
    if (editButton) {
        editButton.addEventListener('click', () => {
            const instanceId = editButton.getAttribute('data-instance-id');
            openTextEditor(instanceId);
        });
    }
    
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const instanceId = deleteButton.getAttribute('data-instance-id');
            removeTextBlockFromReport(instanceId);
        });
    }
}

/**
 * Open text editor modal
 * @param {string} textBlockId - The text block ID
 */
function openTextEditor(textBlockId) {
    const textBlock = currentTemplate.configuration.textBlocks.find(block => block.id === textBlockId);
    if (!textBlock) return;
    
    const textEditor = document.getElementById('text-editor-modal');
    const textContent = document.getElementById('text-editor-content');
    
    if (textEditor && textContent) {
        textContent.value = textBlock.content;
        
        // Set current element reference
        currentElement = {
            type: 'text',
            id: textBlockId,
            config: textBlock
        };
        
        textEditor.classList.remove('hidden');
        textEditor.classList.add('flex');
        textContent.focus();
    }
}

/**
 * Apply text editor content
 */
function applyTextEditorContent() {
    if (!currentElement || currentElement.type !== 'text') return;
    
    const textEditorModal = document.getElementById('text-editor-modal');
    const textContentTextarea = document.getElementById('text-editor-content');
    
    // Get text block element
    const textBlockElement = document.getElementById(currentElement.id);
    if (!textBlockElement) return;
    
    // Update text content in the element
    const textContentElement = textBlockElement.querySelector('.text-content');
    if (textContentElement && textContentTextarea) {
        // Parse markdown or simply wrap in paragraph tags
        const formattedContent = textContentTextarea.value
            .split('\n\n')
            .map(paragraph => `<p>${paragraph}</p>`)
            .join('');
            
        textContentElement.innerHTML = formattedContent;
    }
    
    // Update text block config
    const textBlockConfig = currentTemplate.configuration.textBlocks.find(block => block.id === currentElement.id);
    if (textBlockConfig && textContentTextarea) {
        textBlockConfig.content = textContentTextarea.value;
    }
    
    // Close modal
    textEditorModal.classList.add('hidden');
    textEditorModal.classList.remove('flex');
    
    // Clear current element
    currentElement = null;
}

/**
 * Remove a text block from the report
 * @param {string} textBlockId - The text block ID
 */
function removeTextBlockFromReport(textBlockId) {
    // Remove text block element from the DOM
    const textBlockElement = document.getElementById(textBlockId);
    if (textBlockElement) {
        textBlockElement.remove();
    }
    
    // Remove text block from the configuration
    const index = currentTemplate.configuration.textBlocks.findIndex(block => block.id === textBlockId);
    if (index !== -1) {
        currentTemplate.configuration.textBlocks.splice(index, 1);
    }
}

/**
 * Add a table to the report
 * @param {string} tableId - The table ID
 * @param {HTMLElement} dropZone - The drop zone element
 */
function addTableToReport(tableId, dropZone) {
    // Create a unique ID for this table instance
    const tableInstanceId = `table-${tableId}-${Date.now()}`;
    
    // Add table to the configuration
    const tableConfig = {
        id: tableInstanceId,
        type: tableId,
        title: getTableTitle(tableId),
        limit: 10,
        columns: getDefaultTableColumns(tableId)
    };
    
    currentTemplate.configuration.tables = currentTemplate.configuration.tables || [];
    currentTemplate.configuration.tables.push(tableConfig);
    
    // Create table element
    const tableElement = document.createElement('div');
    tableElement.id = tableInstanceId;
    tableElement.className = 'relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4';
    tableElement.setAttribute('data-table-id', tableId);
    tableElement.setAttribute('data-instance-id', tableInstanceId);
    
    tableElement.innerHTML = `
        <div class="absolute top-2 right-2 flex space-x-2">
            <button class="text-gray-400 hover:text-blue-500 edit-table" data-instance-id="${tableInstanceId}">
                <i class="ri-settings-line"></i>
            </button>
            <button class="text-gray-400 hover:text-red-500 delete-table" data-instance-id="${tableInstanceId}">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
        <h3 class="text-lg font-medium mb-4">${getTableTitle(tableId)}</h3>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        ${getDefaultTableColumns(tableId).map(column => 
                            `<th scope="col" class="px-6 py-3">${column.name}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr class="bg-white dark:bg-gray-800">
                        ${getDefaultTableColumns(tableId).map(() => 
                            `<td class="px-6 py-4">0</td>`
                        ).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    // Add table to drop zone
    dropZone.appendChild(tableElement);
    
    // Make table draggable
    makeTableDraggable(tableElement);
    
    // Add event listeners for table controls
    addTableEventListeners(tableElement);
}

/**
 * Get the title for a table based on its ID
 * @param {string} tableId - The table ID
 * @returns {string} The table title
 */
function getTableTitle(tableId) {
    switch (tableId) {
        case 'testResults':
            return 'Test Results';
        default:
            return 'Table';
    }
}

/**
 * Get default table columns based on table ID
 * @param {string} tableId - The table ID
 * @returns {Array} Array of column objects
 */
function getDefaultTableColumns(tableId) {
    switch (tableId) {
        case 'testResults':
            return [
                { id: 'name', name: 'Test Name' },
                { id: 'status', name: 'Status' },
                { id: 'duration', name: 'Duration' },
                { id: 'date', name: 'Date' }
            ];
        default:
            return [
                { id: 'col1', name: 'Column 1' },
                { id: 'col2', name: 'Column 2' }
            ];
    }
}

/**
 * Make a table element draggable
 * @param {HTMLElement} tableElement - The table element
 */
function makeTableDraggable(tableElement) {
    tableElement.setAttribute('draggable', 'true');
    
    tableElement.addEventListener('dragstart', (e) => {
        const instanceId = tableElement.getAttribute('data-instance-id');
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            elementType: 'table',
            id: tableElement.getAttribute('data-table-id'),
            elementId: instanceId,
            isNew: false
        }));
        
        tableElement.classList.add('opacity-50');
    });
    
    tableElement.addEventListener('dragend', () => {
        tableElement.classList.remove('opacity-50');
    });
}

/**
 * Add event listeners for table controls
 * @param {HTMLElement} tableElement - The table element
 */
function addTableEventListeners(tableElement) {
    const editButton = tableElement.querySelector('.edit-table');
    const deleteButton = tableElement.querySelector('.delete-table');
    
    if (editButton) {
        editButton.addEventListener('click', () => {
            const instanceId = editButton.getAttribute('data-instance-id');
            // Open table settings here (not implemented in this example)
            showToast('Table settings not implemented yet', 'info');
        });
    }
    
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const instanceId = deleteButton.getAttribute('data-instance-id');
            removeTableFromReport(instanceId);
        });
    }
}

/**
 * Remove a table from the report
 * @param {string} tableInstanceId - The table instance ID
 */
function removeTableFromReport(tableInstanceId) {
    // Remove table element from the DOM
    const tableElement = document.getElementById(tableInstanceId);
    if (tableElement) {
        tableElement.remove();
    }
    
    // Remove table from the configuration
    const index = currentTemplate.configuration.tables.findIndex(table => table.id === tableInstanceId);
    if (index !== -1) {
        currentTemplate.configuration.tables.splice(index, 1);
    }
}

/**
 * Add a divider to the report
 * @param {HTMLElement} dropZone - The drop zone element
 */
function addDividerToReport(dropZone) {
    // Create a unique ID for this divider instance
    const dividerId = `divider-${Date.now()}`;
    
    // Create divider element
    const dividerElement = document.createElement('div');
    dividerElement.id = dividerId;
    dividerElement.className = 'relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4';
    dividerElement.setAttribute('data-element-type', 'divider');
    dividerElement.setAttribute('data-instance-id', dividerId);
    
    dividerElement.innerHTML = `
        <div class="absolute top-2 right-2">
            <button class="text-gray-400 hover:text-red-500 delete-divider" data-instance-id="${dividerId}">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
        <div class="border-t border-gray-200 dark:border-gray-700 my-4"></div>
    `;
    
    // Add divider to drop zone
    dropZone.appendChild(dividerElement);
    
    // Make divider draggable
    makeDividerDraggable(dividerElement);
    
    // Add event listeners for divider controls
    addDividerEventListeners(dividerElement);
}

/**
 * Make a divider element draggable
 * @param {HTMLElement} dividerElement - The divider element
 */
function makeDividerDraggable(dividerElement) {
    dividerElement.setAttribute('draggable', 'true');
    
    dividerElement.addEventListener('dragstart', (e) => {
        const instanceId = dividerElement.getAttribute('data-instance-id');
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            elementType: 'divider',
            elementId: instanceId,
            isNew: false
        }));
        
        dividerElement.classList.add('opacity-50');
    });
    
    dividerElement.addEventListener('dragend', () => {
        dividerElement.classList.remove('opacity-50');
    });
}

/**
 * Add event listeners for divider controls
 * @param {HTMLElement} dividerElement - The divider element
 */
function addDividerEventListeners(dividerElement) {
    const deleteButton = dividerElement.querySelector('.delete-divider');
    
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const instanceId = deleteButton.getAttribute('data-instance-id');
            removeDividerFromReport(instanceId);
        });
    }
}

/**
 * Remove a divider from the report
 * @param {string} dividerId - The divider ID
 */
function removeDividerFromReport(dividerId) {
    // Remove divider element from the DOM
    const dividerElement = document.getElementById(dividerId);
    if (dividerElement) {
        dividerElement.remove();
    }
}

// Export functions for use in other modules
window.addTextBlockToReport = addTextBlockToReport;
window.makeTextBlockDraggable = makeTextBlockDraggable;
window.addTextBlockEventListeners = addTextBlockEventListeners;
window.openTextEditor = openTextEditor;
window.applyTextEditorContent = applyTextEditorContent;
window.removeTextBlockFromReport = removeTextBlockFromReport;
window.addTableToReport = addTableToReport;
window.getTableTitle = getTableTitle;
window.getDefaultTableColumns = getDefaultTableColumns;
window.makeTableDraggable = makeTableDraggable;
window.addTableEventListeners = addTableEventListeners;
window.removeTableFromReport = removeTableFromReport;
window.addDividerToReport = addDividerToReport;
window.makeDividerDraggable = makeDividerDraggable;
window.addDividerEventListeners = addDividerEventListeners;
window.removeDividerFromReport = removeDividerFromReport;