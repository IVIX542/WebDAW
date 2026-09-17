document.addEventListener('DOMContentLoaded', async () => {
    // --- Configuration System ---
    const DEFAULT_CONFIG = {
        theme: { bgDark: '#0f111a', bgPanel: '#191c29', accent: '#6366f1', font: 'Inter' },
        layout: { navPos: 'left', topicsPos: 'left' },
        subjects: [
            { id: 'dwec', name: 'Entorno Cliente', icon: '💻', color: '#6366f1' },
            { id: 'dwes', name: 'Entorno Servidor', icon: '⚙️', color: '#10b981' },
            { id: 'daw', name: 'Despliegue', icon: '🚀', color: '#f59e0b' },
            { id: 'diw', name: 'Diseño de Interfaces', icon: '🎨', color: '#ec4899' }
        ],
        shortcuts: { bold: 'ctrl+b', italic: 'ctrl+i', underline: 'ctrl+u', h1: 'ctrl+1', h2: 'ctrl+2', p: 'ctrl+p', save: 'ctrl+s' }
    };
    let APP_CONFIG = JSON.parse(localStorage.getItem('webdaw_config')) || DEFAULT_CONFIG;

    // --- State ---
    let currentSubject = 'dwec';
    let currentTopicId = null;

    // UI Elements
    const navItems = document.querySelectorAll('.nav-item');
    const subjectTitle = document.getElementById('current-subject-title');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const topicsList = document.getElementById('topics-list');
    const newTopicBtn = document.getElementById('new-topic-btn');
    const editorContainer = document.getElementById('editor-container');
    const noTopicSelected = document.getElementById('no-topic-selected');
    const currentTopicTitle = document.getElementById('current-topic-title');
    const editor = document.getElementById('editor');

    const toolBtns = document.querySelectorAll('.tool-btn[data-command]');
    const noteImageInput = document.getElementById('note-image-input');
    const saveNotesBtn = document.getElementById('save-notes-btn');
    const saveStatus = document.getElementById('save-status');

    const galleryImageInput = document.getElementById('gallery-image-input');
    const galleryGrid = document.getElementById('gallery-grid');

    const searchInput = document.getElementById('global-search');
    const searchResults = document.getElementById('search-results');

    // Mobile UI Elements
    const mobileOverlay = document.getElementById('mobile-overlay');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const topicsSidebar = document.getElementById('topics-sidebar');
    const mobileTopicsBtn = document.getElementById('mobile-topics-btn');
    const mobileTopicsBtnEmpty = document.getElementById('mobile-topics-btn-empty');
    const closeTopicsBtn = document.getElementById('close-topics-btn');

    // UI Elements for Modals
    const modalOverlay = document.getElementById('modal-overlay');
    const promptModal = document.getElementById('prompt-modal');
    const promptTitle = document.getElementById('prompt-title');
    const promptInput = document.getElementById('prompt-input');
    const promptCancel = document.getElementById('prompt-cancel');
    const promptConfirmBtn = document.getElementById('prompt-confirm');

    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmCancel = document.getElementById('confirm-cancel');
    const confirmAccept = document.getElementById('confirm-accept');

    const contextMenu = document.getElementById('context-menu');
    const ctxRename = document.getElementById('ctx-rename');
    const ctxDelete = document.getElementById('ctx-delete');

    const infoBtn = document.getElementById('info-btn');
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const shortcutsClose = document.getElementById('shortcuts-close');

    // Config Modals Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsCancel = document.getElementById('settings-cancel');
    const settingsSave = document.getElementById('settings-save');

    // Helper for formatting shortcuts
    function formatShortcut(e) {
        const keys = [];
        if (e.ctrlKey || e.metaKey) keys.push('ctrl');
        if (e.altKey) keys.push('alt');
        if (e.shiftKey) keys.push('shift');
        if (e.key !== 'Control' && e.key !== 'Meta' && e.key !== 'Alt' && e.key !== 'Shift') {
            keys.push(e.key.toLowerCase());
        }
        return keys.join('+');
    }

    // --- Dynamic Application ---
    function applyConfig() {
        const root = document.documentElement;
        root.style.setProperty('--bg-dark', APP_CONFIG.theme.bgDark);
        root.style.setProperty('--bg-panel', APP_CONFIG.theme.bgPanel);
        root.style.setProperty('--accent-primary', APP_CONFIG.theme.accent);
        root.style.fontFamily = APP_CONFIG.theme.font + ', sans-serif';

        const appContainer = document.querySelector('.app-container');
        if (APP_CONFIG.layout.navPos === 'bottom') appContainer.classList.add('layout-nav-bottom');
        else appContainer.classList.remove('layout-nav-bottom');

        const notesLayout = document.querySelector('.notes-layout');
        if (APP_CONFIG.layout.topicsPos === 'right') notesLayout.classList.add('layout-topics-right');
        else notesLayout.classList.remove('layout-topics-right');

        const navMenu = document.getElementById('nav-menu');
        navMenu.innerHTML = '';
        APP_CONFIG.subjects.forEach(subj => {
            const btn = document.createElement('button');
            btn.className = `nav-item ${currentSubject === subj.id ? 'active' : ''}`;
            btn.dataset.subject = subj.id;
            btn.innerHTML = `<span class="icon">${subj.icon}</span> ${subj.name}`;
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                currentSubject = subj.id;
                currentTopicId = null;
                updateEditorVisibility();
                await loadTopics();
                const activeSubj = APP_CONFIG.subjects.find(s => s.id === currentSubject);
                if (activeSubj) document.getElementById('current-subject-title').textContent = activeSubj.name;
            });
            navMenu.appendChild(btn);
        });

        const activeSubj = APP_CONFIG.subjects.find(s => s.id === currentSubject);
        if (activeSubj) document.getElementById('current-subject-title').textContent = activeSubj.name;

        localStorage.setItem('webdaw_config', JSON.stringify(APP_CONFIG));
    }

    applyConfig();

    // Custom Modals Logic
    function customPrompt(title, defaultValue = '') {
        return new Promise((resolve) => {
            promptTitle.textContent = title;
            promptInput.value = defaultValue;
            modalOverlay.classList.remove('hidden');
            promptModal.classList.remove('hidden');
            promptInput.focus();
            promptInput.select();

            const cleanup = () => {
                modalOverlay.classList.add('hidden');
                promptModal.classList.add('hidden');
                promptConfirmBtn.removeEventListener('click', onConfirm);
                promptCancel.removeEventListener('click', onCancel);
                promptInput.removeEventListener('keydown', onKey);
            };

            const onConfirm = () => { cleanup(); resolve(promptInput.value); };
            const onCancel = () => { cleanup(); resolve(null); };
            const onKey = (e) => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel(); };

            promptConfirmBtn.addEventListener('click', onConfirm);
            promptCancel.addEventListener('click', onCancel);
            promptInput.addEventListener('keydown', onKey);
        });
    }

    function customConfirm(message) {
        return new Promise((resolve) => {
            confirmMessage.textContent = message;
            modalOverlay.classList.remove('hidden');
            confirmModal.classList.remove('hidden');

            const cleanup = () => {
                modalOverlay.classList.add('hidden');
                confirmModal.classList.add('hidden');
                confirmAccept.removeEventListener('click', onAccept);
                confirmCancel.removeEventListener('click', onCancel);
            };

            const onAccept = () => { cleanup(); resolve(true); };
            const onCancel = () => { cleanup(); resolve(false); };

            confirmAccept.addEventListener('click', onAccept);
            confirmCancel.addEventListener('click', onCancel);
        });
    }

    // Context Menu & General Clicks Logic
    document.addEventListener('click', (e) => {
        if (!contextMenu.classList.contains('hidden')) {
            contextMenu.classList.add('hidden');
        }

        // Close main sidebar on mobile if clicked outside
        if (sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) &&
                (!mobileMenuBtn || !mobileMenuBtn.contains(e.target))) {
                closeAllMobileDrawers();
            }
        }

        // Close topics sidebar on mobile if clicked outside
        if (topicsSidebar && topicsSidebar.classList.contains('open')) {
            if (!topicsSidebar.contains(e.target) &&
                (!mobileTopicsBtn || !mobileTopicsBtn.contains(e.target)) &&
                (!mobileTopicsBtnEmpty || !mobileTopicsBtnEmpty.contains(e.target))) {
                closeAllMobileDrawers();
            }
        }
    });

    ctxRename.addEventListener('click', async () => {
        if (!contextMenuTopicId) return;
        const topic = (await window.DB.getTopicsBySubject(currentSubject)).find(t => t.id === contextMenuTopicId);
        if (topic) {
            const newTitle = await customPrompt('Renombrar tema:', topic.title);
            if (newTitle && newTitle.trim()) {
                await window.DB.renameTopic(contextMenuTopicId, newTitle.trim());
                if (currentTopicId === contextMenuTopicId) {
                    currentTopicTitle.textContent = newTitle.trim();
                }
                await loadTopics();
            }
        }
    });

    ctxDelete.addEventListener('click', async () => {
        if (!contextMenuTopicId) return;
        const confirmed = await customConfirm('¿Estás seguro de que quieres eliminar este tema?');
        if (confirmed) {
            await window.DB.deleteTopic(contextMenuTopicId);
            if (currentTopicId === contextMenuTopicId) {
                currentTopicId = null;
                updateEditorVisibility();
            }
            await loadTopics();
        }
    });

    // Shortcuts Modal
    const closeShortcutsModal = () => {
        if (!shortcutsModal.classList.contains('hidden')) {
            shortcutsModal.classList.add('hidden');
            modalOverlay.classList.add('hidden');
        }
    };

    const closeSettingsModal = () => {
        if (!settingsModal.classList.contains('hidden')) {
            settingsModal.classList.add('hidden');
            if (document.querySelectorAll('.custom-modal:not(.hidden)').length === 0) {
                modalOverlay.classList.add('hidden');
            }
        }
    };

    infoBtn.addEventListener('click', () => {
        const list = document.getElementById('shortcuts-display-list');
        list.innerHTML = `
            <li><span>${APP_CONFIG.shortcuts.bold.toUpperCase()}</span> Negrita</li>
            <li><span>${APP_CONFIG.shortcuts.italic.toUpperCase()}</span> Cursiva</li>
            <li><span>${APP_CONFIG.shortcuts.underline.toUpperCase()}</span> Subrayado</li>
            <li><span>${APP_CONFIG.shortcuts.h1.toUpperCase()}</span> Título 1 (H1)</li>
            <li><span>${APP_CONFIG.shortcuts.h2.toUpperCase()}</span> Título 2 (H2)</li>
            <li><span>${APP_CONFIG.shortcuts.p.toUpperCase()}</span> Párrafo normal</li>
            <li><span>${APP_CONFIG.shortcuts.save.toUpperCase()}</span> Guardar apuntes</li>
        `;
        modalOverlay.classList.remove('hidden');
        shortcutsModal.classList.remove('hidden');
    });

    shortcutsClose.addEventListener('click', closeShortcutsModal);
    settingsCancel.addEventListener('click', closeSettingsModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeShortcutsModal();
            closeSettingsModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeShortcutsModal();
            closeSettingsModal();
        }
    });

    // Settings Modal Open
    settingsBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('hidden');
        settingsModal.classList.remove('hidden');
        
        // Populate inputs
        document.getElementById('cfg-bg-dark').value = APP_CONFIG.theme.bgDark;
        document.getElementById('cfg-bg-panel').value = APP_CONFIG.theme.bgPanel;
        document.getElementById('cfg-accent').value = APP_CONFIG.theme.accent;
        document.getElementById('cfg-font').value = APP_CONFIG.theme.font;
        document.getElementById('cfg-nav-pos').value = APP_CONFIG.layout.navPos;
        document.getElementById('cfg-topics-pos').value = APP_CONFIG.layout.topicsPos;

        // Populate Subjects
        const subList = document.getElementById('cfg-subjects-list');
        subList.innerHTML = '';
        APP_CONFIG.subjects.forEach(subj => {
            subList.innerHTML += `
                <div class="subject-edit-row" data-id="${subj.id}">
                    <input type="text" class="subj-icon" value="${subj.icon}">
                    <input type="text" class="subj-name" value="${subj.name}">
                    <input type="color" class="subj-color" value="${subj.color}">
                </div>
            `;
        });

        // Populate Shortcuts
        const shortList = document.getElementById('cfg-shortcuts-list');
        shortList.innerHTML = '';
        Object.keys(APP_CONFIG.shortcuts).forEach(key => {
            const row = document.createElement('div');
            row.className = 'shortcut-edit-row';
            row.innerHTML = `
                <span>${key.toUpperCase()}</span>
                <input type="text" readonly data-key="${key}" value="${APP_CONFIG.shortcuts[key]}">
            `;
            const input = row.querySelector('input');
            input.addEventListener('keydown', (e) => {
                e.preventDefault();
                const combo = formatShortcut(e);
                // Evitamos guardar si solo pulsó modificadores sin una letra
                if (combo !== 'ctrl' && combo !== 'alt' && combo !== 'shift' && !combo.endsWith('+')) {
                    input.value = combo;
                }
            });
            shortList.appendChild(row);
        });
    });

    // Settings Save
    settingsSave.addEventListener('click', () => {
        APP_CONFIG.theme.bgDark = document.getElementById('cfg-bg-dark').value;
        APP_CONFIG.theme.bgPanel = document.getElementById('cfg-bg-panel').value;
        APP_CONFIG.theme.accent = document.getElementById('cfg-accent').value;
        APP_CONFIG.theme.font = document.getElementById('cfg-font').value;
        
        APP_CONFIG.layout.navPos = document.getElementById('cfg-nav-pos').value;
        APP_CONFIG.layout.topicsPos = document.getElementById('cfg-topics-pos').value;

        // Update Subjects
        const newSubjects = [];
        document.querySelectorAll('.subject-edit-row').forEach(row => {
            newSubjects.push({
                id: row.dataset.id,
                icon: row.querySelector('.subj-icon').value,
                name: row.querySelector('.subj-name').value,
                color: row.querySelector('.subj-color').value
            });
        });
        APP_CONFIG.subjects = newSubjects;

        // Update Shortcuts
        document.querySelectorAll('.shortcut-edit-row input').forEach(input => {
            APP_CONFIG.shortcuts[input.dataset.key] = input.value.toLowerCase();
        });

        applyConfig();
        closeSettingsModal();
    });

    // Settings Tabs logic
    const setTabBtns = document.querySelectorAll('.set-tab-btn');
    const setPanes = document.querySelectorAll('.set-pane');
    setTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTabBtns.forEach(b => b.classList.remove('active'));
            setPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // --- Mobile Interactivity ---
    function closeAllMobileDrawers() {
        sidebar.classList.remove('open');
        topicsSidebar.classList.remove('open');
        mobileOverlay.classList.remove('active');
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            mobileOverlay.classList.add('active');
        });
    }

    if (mobileTopicsBtn) {
        mobileTopicsBtn.addEventListener('click', () => {
            topicsSidebar.classList.toggle('open');
        });
    }

    if (mobileTopicsBtnEmpty) {
        mobileTopicsBtnEmpty.addEventListener('click', () => {
            topicsSidebar.classList.toggle('open');
        });
    }

    if (closeTopicsBtn) {
        closeTopicsBtn.addEventListener('click', () => {
            topicsSidebar.classList.remove('open');
        });
    }

    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', (e) => {
            // Only close if we clicked exactly on the overlay (preventing double triggering with modalOverlay if they stack)
            if (e.target === mobileOverlay) {
                closeAllMobileDrawers();
            }
        });
    }

    // Editor Toolbar More Options Logic
    const moreToolsToggle = document.getElementById('more-tools-toggle');
    const moreToolsMenu = document.getElementById('more-tools-menu');

    if (moreToolsToggle && moreToolsMenu) {
        moreToolsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            moreToolsMenu.classList.toggle('show');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (moreToolsMenu.classList.contains('show') && !moreToolsMenu.contains(e.target)) {
                moreToolsMenu.classList.remove('show');
            }
        });

        // Close when a tool is clicked inside the menu
        moreToolsMenu.addEventListener('click', (e) => {
            if (e.target.closest('.tool-btn')) {
                moreToolsMenu.classList.remove('show');
            }
        });
    }

    // Subject mapping
    const subjectNames = {
        'dwec': 'Desarrollo Web en Entorno Cliente',
        'dwes': 'Desarrollo Web en Entorno Servidor',
        'daw': 'Despliegue de Aplicaciones Web',
        'diw': 'Diseño de Interfaces Web'
    };

    // --- Navigation ---
    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            closeAllMobileDrawers();
            if (currentTopicId) await saveCurrentTopic(); // auto-save on switch

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            currentSubject = item.dataset.subject;
            subjectTitle.textContent = subjectNames[currentSubject];

            currentTopicId = null; // Reset selected topic
            updateEditorVisibility();
            await loadSubjectData();
        });
    });

    // --- Tabs ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-section`).classList.add('active');
        });
    });

    // --- Topics ---
    newTopicBtn.addEventListener('click', async () => {
        const title = await customPrompt('Introduce el título del nuevo tema:');
        if (title && title.trim()) {
            try {
                const newId = await window.DB.addTopic(currentSubject, title.trim());
                await loadTopics(); // reload list
                await selectTopic(newId, title.trim(), ''); // select it
            } catch (error) {
                console.error("Error creating topic:", error);
            }
        }
    });

    async function loadTopics() {
        topicsList.innerHTML = '';
        try {
            const topics = await window.DB.getTopicsBySubject(currentSubject);
            topics.forEach(topic => {
                const div = document.createElement('div');
                div.className = `topic-item ${currentTopicId === topic.id ? 'active' : ''}`;
                div.textContent = topic.title;
                div.dataset.id = topic.id;
                div.draggable = true;

                div.addEventListener('click', async () => {
                    if (currentTopicId && currentTopicId !== topic.id) {
                        await saveCurrentTopic();
                    }
                    await selectTopic(topic.id, topic.title, topic.content);
                });
                div.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    contextMenuTopicId = topic.id;
                    contextMenu.style.left = `${e.pageX}px`;
                    contextMenu.style.top = `${e.pageY}px`;
                    contextMenu.classList.remove('hidden');
                });

                div.addEventListener('dragstart', handleDragStart);
                div.addEventListener('dragover', handleDragOver);
                div.addEventListener('dragenter', handleDragEnter);
                div.addEventListener('dragleave', handleDragLeave);
                div.addEventListener('drop', handleDrop);
                div.addEventListener('dragend', handleDragEnd);

                topicsList.appendChild(div);
            });
        } catch (error) {
            console.error("Error loading topics:", error);
        }
    }

    async function selectTopic(id, title, content) {
        closeAllMobileDrawers();
        currentTopicId = id;
        currentTopicTitle.textContent = title;
        editor.innerHTML = content || '';
        updateEditorVisibility();

        // Update active class in list
        document.querySelectorAll('.topic-item').forEach(el => el.classList.remove('active'));
        await loadTopics();
        updateSubtopicsSidebar();
    }

    function updateSubtopicsSidebar() {
        if (!currentTopicId) return;

        const activeTopicDiv = document.querySelector(`.topic-item[data-id="${currentTopicId}"]`);
        if (!activeTopicDiv) return;

        const existingList = activeTopicDiv.nextElementSibling;
        if (existingList && existingList.classList.contains('subtopics-list')) {
            existingList.remove();
        }

        const headers = editor.querySelectorAll('h1, h2');
        if (headers.length === 0) return;

        const subtopicsList = document.createElement('div');
        subtopicsList.className = 'subtopics-list';

        headers.forEach((header, index) => {
            if (!header.id) {
                header.id = `subtopic-${currentTopicId}-${Date.now()}-${index}`;
            }

            const navItem = document.createElement('div');
            navItem.className = `subtopic-nav ${header.tagName.toLowerCase()}-level`;
            navItem.textContent = header.textContent || 'Sin título';

            navItem.addEventListener('click', (e) => {
                e.stopPropagation();
                header.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });

            subtopicsList.appendChild(navItem);
        });

        activeTopicDiv.parentNode.insertBefore(subtopicsList, activeTopicDiv.nextSibling);
    }

    function updateEditorVisibility() {
        if (currentTopicId) {
            editorContainer.classList.remove('hidden');
            noTopicSelected.classList.add('hidden');
        } else {
            editorContainer.classList.add('hidden');
            noTopicSelected.classList.remove('hidden');
        }
    }

    // --- Drag and Drop Logic ---
    let draggedItem = null;

    function handleDragStart(e) {
        draggedItem = this;
        this.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.id);
    }

    function handleDragOver(e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        this.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    async function handleDrop(e) {
        if (e.stopPropagation) e.stopPropagation();

        if (draggedItem !== this) {
            this.classList.remove('drag-over');

            const list = topicsList;
            const items = Array.from(list.querySelectorAll('.topic-item'));
            const draggedIndex = items.indexOf(draggedItem);
            const targetIndex = items.indexOf(this);

            if (draggedIndex < targetIndex) {
                this.parentNode.insertBefore(draggedItem, this.nextSibling);
            } else {
                this.parentNode.insertBefore(draggedItem, this);
            }

            const updatedItems = Array.from(list.querySelectorAll('.topic-item'));
            const topicsOrderData = updatedItems.map((item, index) => ({
                id: parseInt(item.dataset.id, 10),
                order: index
            }));

            try {
                await window.DB.updateTopicsOrder(topicsOrderData);
                await loadTopics();
                updateSubtopicsSidebar();
            } catch (error) {
                console.error("Error updating order", error);
            }
        }
        return false;
    }

    function handleDragEnd(e) {
        this.style.opacity = '1';
        document.querySelectorAll('.topic-item').forEach(item => {
            item.classList.remove('drag-over');
        });
        draggedItem = null;
    }

    // --- Editor Commands ---
    let subtopicsDebounce;
    editor.addEventListener('input', () => {
        clearTimeout(subtopicsDebounce);
        subtopicsDebounce = setTimeout(() => {
            updateSubtopicsSidebar();
            // Automatically save to DB so generated IDs are persisted instantly
            saveCurrentTopic();
        }, 1000);
    });

    editor.addEventListener('keydown', (e) => {
        // --- Indentation Logic (TAB / Shift+TAB) ---
        if (e.key === 'Tab') {
            e.preventDefault();
            
            // Allow native list indentation if inside UL/OL
            if (document.queryCommandState('insertUnorderedList') || document.queryCommandState('insertOrderedList')) {
                document.execCommand(e.shiftKey ? 'outdent' : 'indent');
                return;
            }

            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            let currentBlock = selection.getRangeAt(0).startContainer;
            if (currentBlock.nodeType === 3) currentBlock = currentBlock.parentNode;

            // Find the closest block level element
            while (currentBlock && currentBlock !== editor && !['P', 'H1', 'H2', 'DIV', 'LI'].includes(currentBlock.tagName)) {
                currentBlock = currentBlock.parentNode;
            }

            if (currentBlock && currentBlock !== editor) {
                let currentMargin = parseInt(window.getComputedStyle(currentBlock).marginLeft) || 0;
                let newMargin = e.shiftKey ? Math.max(0, currentMargin - 40) : currentMargin + 40;
                currentBlock.style.marginLeft = `${newMargin}px`;
            }
            return;
        }

        const currentCombo = formatShortcut(e);

        // Bloquear atajos nativos del navegador que causan comportamientos duplicados
        const nativeCombos = ['ctrl+b', 'ctrl+i', 'ctrl+u', 'ctrl+s'];
        if (nativeCombos.includes(currentCombo)) {
            e.preventDefault();
        }

        let command = null;
        let value = null;

        for (const [key, combo] of Object.entries(APP_CONFIG.shortcuts)) {
            if (currentCombo === combo) {
                switch (key) {
                    case 'bold': command = 'bold'; break;
                    case 'italic': command = 'italic'; break;
                    case 'underline': command = 'underline'; break;
                    case 'h1': command = 'formatBlock'; value = 'H1'; break;
                    case 'h2': command = 'formatBlock'; value = 'H2'; break;
                    case 'p': command = 'formatBlock'; value = 'P'; break;
                    case 'save':
                        e.preventDefault();
                        saveCurrentTopic().then(() => showSaveStatus());
                        return;
                }
                break; // Found matching shortcut
            }
        }

        if (command) {
            e.preventDefault();
            document.execCommand(command, false, value);
            
            // Auto-indent for headers explicitly set by shortcut
            if (command === 'formatBlock' && (value === 'H1' || value === 'H2')) {
                const selection = window.getSelection();
                if (selection.rangeCount) {
                    let currentBlock = selection.getRangeAt(0).startContainer;
                    if (currentBlock.nodeType === 3) currentBlock = currentBlock.parentNode;
                    while (currentBlock && currentBlock !== editor && !['P', 'H1', 'H2', 'DIV', 'LI'].includes(currentBlock.tagName)) {
                        currentBlock = currentBlock.parentNode;
                    }
                    if (currentBlock && currentBlock !== editor) {
                        currentBlock.style.marginLeft = value === 'H2' ? '40px' : '0px';
                    }
                }
            }
            
            updateSubtopicsSidebar();
        }
    });

    // --- Auto-Indentation (Enter) ---
    editor.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            let currentBlock = selection.getRangeAt(0).startContainer;
            if (currentBlock.nodeType === 3) currentBlock = currentBlock.parentNode;
            
            while (currentBlock && currentBlock !== editor && !['P', 'H1', 'H2', 'DIV', 'LI'].includes(currentBlock.tagName)) {
                currentBlock = currentBlock.parentNode;
            }

            if (currentBlock && (currentBlock.tagName === 'P' || currentBlock.tagName === 'DIV') && currentBlock !== editor) {
                let prevBlock = currentBlock.previousElementSibling;
                while (prevBlock && prevBlock.tagName === 'BR') {
                    prevBlock = prevBlock.previousElementSibling;
                }
                if (prevBlock) {
                    if (prevBlock.tagName === 'H2') {
                        currentBlock.style.marginLeft = '40px';
                    } else if (prevBlock.tagName === 'H1') {
                        currentBlock.style.marginLeft = '0px';
                    }
                }
            }
        }
    });

    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.dataset.command;
            const value = btn.dataset.value || null;
            document.execCommand(command, false, value);
            
            // Auto-indent for headers explicitly set by button
            if (command === 'formatBlock' && (value === 'H1' || value === 'H2')) {
                const selection = window.getSelection();
                if (selection.rangeCount) {
                    let currentBlock = selection.getRangeAt(0).startContainer;
                    if (currentBlock.nodeType === 3) currentBlock = currentBlock.parentNode;
                    while (currentBlock && currentBlock !== editor && !['P', 'H1', 'H2', 'DIV', 'LI'].includes(currentBlock.tagName)) {
                        currentBlock = currentBlock.parentNode;
                    }
                    if (currentBlock && currentBlock !== editor) {
                        currentBlock.style.marginLeft = value === 'H2' ? '40px' : '0px';
                    }
                }
            }
            
            editor.focus();
        });
    });

    noteImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Url = e.target.result;
                editor.focus();
                document.execCommand('insertImage', false, base64Url);
            };
            reader.readAsDataURL(file);
        }
        noteImageInput.value = '';
    });

    // Save Notes
    saveNotesBtn.addEventListener('click', async () => {
        await saveCurrentTopic();
        showSaveStatus();
    });

    async function saveCurrentTopic() {
        if (!currentTopicId) return;
        const content = editor.innerHTML;
        try {
            await window.DB.updateTopicContent(currentTopicId, content);
        } catch (error) {
            console.error('Error saving topic:', error);
        }
    }

    function showSaveStatus() {
        saveStatus.style.opacity = '1';
        setTimeout(() => {
            saveStatus.style.opacity = '0';
        }, 2000);
    }

    // --- Search ---
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const results = await window.DB.searchTopics(query);
                renderSearchResults(results, query);
            } catch (error) {
                console.error("Error searching:", error);
            }
        }, 300);
    });

    function renderSearchResults(results, query) {
        searchResults.innerHTML = '';
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-empty">No se encontraron resultados</div>';
        } else {
            results.forEach(res => {
                const div = document.createElement('div');
                div.className = 'search-result-item';

                // Extract snippet
                const cleanContent = res.content.replace(/<[^>]+>/g, ' ');
                const matchIndex = cleanContent.toLowerCase().indexOf(query.toLowerCase());
                let snippet = '';
                if (matchIndex !== -1) {
                    const start = Math.max(0, matchIndex - 20);
                    const end = Math.min(cleanContent.length, matchIndex + query.length + 20);
                    snippet = '...' + cleanContent.substring(start, end) + '...';
                } else {
                    snippet = cleanContent.substring(0, 40) + '...';
                }

                div.innerHTML = `
                    <h4>${subjectNames[res.subject]} - ${res.title}</h4>
                    <p>${snippet}</p>
                `;

                div.addEventListener('click', async () => {
                    // Navigate to this result
                    searchInput.value = '';
                    searchResults.classList.add('hidden');

                    // Switch to the subject
                    document.querySelector(`.nav-item[data-subject="${res.subject}"]`).click();

                    // Switch to tab
                    document.querySelector('.tab-btn[data-tab="notes"]').click();

                    // Select topic
                    setTimeout(async () => {
                        await selectTopic(res.id, res.title, res.content);
                    }, 100);
                });
                searchResults.appendChild(div);
            });
        }
        searchResults.classList.remove('hidden');
    }

    // Hide search when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.add('hidden');
        }
    });

    // --- Gallery ---
    galleryImageInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            for (let file of files) {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const base64Url = ev.target.result;
                    try {
                        await window.DB.addGalleryImage(currentSubject, base64Url);
                        await loadGallery();
                    } catch (error) {
                        console.error('Error saving image:', error);
                    }
                };
                reader.readAsDataURL(file);
            }
        }
        galleryImageInput.value = '';
    });

    window.deleteImage = async (id) => {
        const confirmed = await customConfirm('¿Seguro que quieres borrar esta foto?');
        if (confirmed) {
            try {
                await window.DB.deleteGalleryImage(id);
                await loadGallery();
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }
    };

    // ==========================================
    // EDITOR ENHANCEMENTS: Context Menu & Images
    // ==========================================
    const editorContextMenu = document.getElementById('editor-context-menu');
    const imageToolbar = document.getElementById('image-toolbar');
    let activeEditorImage = null;

    // 1. Editor Context Menu
    editor.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'IMG') return;
        
        e.preventDefault();
        contextMenu.classList.add('hidden');
        imageToolbar.classList.add('hidden');
        
        editorContextMenu.style.left = `${e.pageX}px`;
        editorContextMenu.style.top = `${e.pageY}px`;
        editorContextMenu.classList.remove('hidden');
    });

    editorContextMenu.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const command = btn.dataset.command;
        const value = btn.dataset.value || null;
        
        if (command) {
            document.execCommand(command, false, value);
            
            if (command === 'formatBlock' && (value === 'H1' || value === 'H2')) {
                const selection = window.getSelection();
                if (selection.rangeCount) {
                    let currentBlock = selection.getRangeAt(0).startContainer;
                    if (currentBlock.nodeType === 3) currentBlock = currentBlock.parentNode;
                    while (currentBlock && currentBlock !== editor && !['P', 'H1', 'H2', 'DIV', 'LI'].includes(currentBlock.tagName)) {
                        currentBlock = currentBlock.parentNode;
                    }
                    if (currentBlock && currentBlock !== editor) {
                        currentBlock.style.marginLeft = value === 'H2' ? '40px' : '0px';
                    }
                }
            }
        }
        
        editorContextMenu.classList.add('hidden');
        editor.focus();
    });

    document.addEventListener('click', (e) => {
        if (!editorContextMenu.contains(e.target)) {
            editorContextMenu.classList.add('hidden');
        }
        if (!imageToolbar.contains(e.target) && e.target.tagName !== 'IMG') {
            imageToolbar.classList.add('hidden');
            if (activeEditorImage) {
                activeEditorImage.style.outline = 'none';
                activeEditorImage = null;
            }
        }
    });

    // 2. Image Click & Toolbar
    editor.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            
            if (activeEditorImage) activeEditorImage.style.outline = 'none';
            
            activeEditorImage = e.target;
            activeEditorImage.style.outline = '3px solid var(--accent-primary)';
            
            const rect = activeEditorImage.getBoundingClientRect();
            // Show above the image
            imageToolbar.style.left = `${rect.left + window.scrollX}px`;
            imageToolbar.style.top = `${Math.max(0, rect.top + window.scrollY - 50)}px`;
            imageToolbar.classList.remove('hidden');
        }
    });

    imageToolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.img-tool-btn');
        if (!btn || !activeEditorImage) return;
        
        const align = btn.dataset.align;
        const size = btn.dataset.size;
        
        if (align) {
            if (align === 'left') {
                activeEditorImage.style.display = 'block';
                activeEditorImage.style.float = 'left';
                activeEditorImage.style.margin = '0 1rem 1rem 0';
            } else if (align === 'right') {
                activeEditorImage.style.display = 'block';
                activeEditorImage.style.float = 'right';
                activeEditorImage.style.margin = '0 0 1rem 1rem';
            } else {
                activeEditorImage.style.display = 'block';
                activeEditorImage.style.float = 'none';
                activeEditorImage.style.margin = '1rem auto';
            }
        }
        
        if (size) {
            if (size === 'small') activeEditorImage.style.width = '25%';
            else if (size === 'medium') activeEditorImage.style.width = '50%';
            else if (size === 'large') activeEditorImage.style.width = '100%';
        }
        
        const rect = activeEditorImage.getBoundingClientRect();
        imageToolbar.style.left = `${rect.left + window.scrollX}px`;
        imageToolbar.style.top = `${Math.max(0, rect.top + window.scrollY - 50)}px`;
    });

    // 3. Custom Drag and Drop Animation for Images
    let draggedImage = null;
    let dragGhost = null;

    editor.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG') {
            draggedImage = e.target;
            
            dragGhost = draggedImage.cloneNode();
            dragGhost.style.position = 'absolute';
            dragGhost.style.top = '-1000px';
            dragGhost.style.width = '120px';
            dragGhost.style.height = 'auto';
            dragGhost.style.opacity = '0.9';
            dragGhost.style.boxShadow = '0 15px 30px rgba(0,0,0,0.5)';
            dragGhost.style.borderRadius = '8px';
            dragGhost.style.zIndex = '9999';
            dragGhost.style.border = '2px solid var(--accent-primary)';
            document.body.appendChild(dragGhost);
            
            e.dataTransfer.setDragImage(dragGhost, 60, 60);
            e.dataTransfer.effectAllowed = 'move';
            
            setTimeout(() => { draggedImage.style.opacity = '0.3'; }, 0);
            imageToolbar.classList.add('hidden');
            if (activeEditorImage) activeEditorImage.style.outline = 'none';
        }
    });

    editor.addEventListener('dragend', (e) => {
        if (draggedImage) {
            draggedImage.style.opacity = '1';
            draggedImage = null;
        }
        if (dragGhost) {
            dragGhost.remove();
            dragGhost = null;
        }
    });

    editor.addEventListener('dragover', (e) => {
        if (draggedImage) {
            e.preventDefault(); // allow drop
            e.dataTransfer.dropEffect = 'move';
        }
    });

    editor.addEventListener('drop', (e) => {
        if (draggedImage) {
            e.preventDefault();
            
            let range;
            if (document.caretRangeFromPoint) {
                range = document.caretRangeFromPoint(e.clientX, e.clientY);
            } else if (e.rangeParent) {
                range = document.createRange();
                range.setStart(e.rangeParent, e.rangeOffset);
            }
            
            if (range) {
                range.insertNode(draggedImage);
                window.getSelection().removeAllRanges();
            }
            
            draggedImage.style.opacity = '1';
            draggedImage = null;
            if (dragGhost) {
                dragGhost.remove();
                dragGhost = null;
            }
        }
    });

    // --- Data Loading ---
    async function loadSubjectData() {
        await loadTopics();
        await loadGallery();
    }

    async function loadGallery() {
        galleryGrid.innerHTML = '';
        try {
            const images = await window.DB.getGalleryImages(currentSubject);
            images.forEach(img => {
                const div = document.createElement('div');
                div.className = 'gallery-item';
                div.innerHTML = `
                    <img src="${img.data}" alt="Gallery image">
                    <button class="delete-img-btn" onclick="deleteImage(${img.id})" title="Eliminar">✕</button>
                `;
                galleryGrid.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading gallery:', error);
        }
    }

    // Init
    updateEditorVisibility();
    loadSubjectData();
});
