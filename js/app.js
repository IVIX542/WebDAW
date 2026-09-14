document.addEventListener('DOMContentLoaded', () => {
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

    let contextMenuTopicId = null;

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
            const onKey = (e) => { if(e.key === 'Enter') onConfirm(); if(e.key === 'Escape') onCancel(); };

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

    // Context Menu Logic
    document.addEventListener('click', () => {
        if (!contextMenu.classList.contains('hidden')) {
            contextMenu.classList.add('hidden');
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

    infoBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('hidden');
        shortcutsModal.classList.remove('hidden');
    });

    shortcutsClose.addEventListener('click', closeShortcutsModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeShortcutsModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeShortcutsModal();
        }
    });

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
            if(currentTopicId) await saveCurrentTopic(); // auto-save on switch
            
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
                    if(currentTopicId && currentTopicId !== topic.id) {
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
        if (e.ctrlKey || e.metaKey) {
            let command = null;
            let value = null;
            
            switch(e.key.toLowerCase()) {
                case 'b': command = 'bold'; break;
                case 'i': command = 'italic'; break;
                case 'u': command = 'underline'; break;
                case '1': command = 'formatBlock'; value = 'H1'; break;
                case '2': command = 'formatBlock'; value = 'H2'; break;
                case 'p': command = 'formatBlock'; value = 'P'; break;
                case 's': 
                    e.preventDefault();
                    saveCurrentTopic().then(() => showSaveStatus());
                    return;
            }
            
            if (command) {
                e.preventDefault();
                document.execCommand(command, false, value);
                updateSubtopicsSidebar();
            }
        }
    });

    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.dataset.command;
            const value = btn.dataset.value || null;
            document.execCommand(command, false, value);
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
                if(matchIndex !== -1) {
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
        if(!e.target.closest('.search-container')) {
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
        if(confirmed) {
            try {
                await window.DB.deleteGalleryImage(id);
                await loadGallery();
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }
    };

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
