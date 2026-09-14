const DB_NAME = 'DAW_NotesDB';
const DB_VERSION = 2; // Incremented for topics support

let db;

const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
        console.error("Database error: ", event.target.error);
        reject(event.target.error);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        
        // Remove old notes store if it exists
        if (db.objectStoreNames.contains('notes')) {
            db.deleteObjectStore('notes');
        }

        // New topics store
        if (!db.objectStoreNames.contains('topics')) {
            const topicStore = db.createObjectStore('topics', { keyPath: 'id', autoIncrement: true });
            topicStore.createIndex('subject', 'subject', { unique: false });
        }

        // Gallery store
        if (!db.objectStoreNames.contains('gallery')) {
            const galleryStore = db.createObjectStore('gallery', { keyPath: 'id', autoIncrement: true });
            galleryStore.createIndex('subject', 'subject', { unique: false });
        }
    };
});

const DB = {
    // --- Topics ---
    async addTopic(subject, title) {
        await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['topics'], 'readwrite');
            const store = transaction.objectStore('topics');
            
            const index = store.index('subject');
            const getReq = index.getAll(subject);
            
            getReq.onsuccess = () => {
                const existingTopics = getReq.result || [];
                const maxOrder = existingTopics.reduce((max, t) => Math.max(max, t.order || 0), 0);
                const newOrder = existingTopics.length > 0 ? maxOrder + 1 : 0;
                
                const request = store.add({ subject, title, content: '', order: newOrder });
                request.onsuccess = () => resolve(request.result); // Returns new topic id
                request.onerror = () => reject(request.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    async updateTopicContent(id, content) {
        await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['topics'], 'readwrite');
            const store = transaction.objectStore('topics');
            const getReq = store.get(id);
            
            getReq.onsuccess = () => {
                const topic = getReq.result;
                if(topic) {
                    topic.content = content;
                    const putReq = store.put(topic);
                    putReq.onsuccess = () => resolve();
                    putReq.onerror = () => reject(putReq.error);
                } else {
                    reject(new Error("Topic not found"));
                }
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    async getTopicsBySubject(subject) {
        await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['topics'], 'readonly');
            const store = transaction.objectStore('topics');
            const index = store.index('subject');
            const request = index.getAll(subject);
            
            request.onsuccess = () => {
                const results = request.result || [];
                results.sort((a, b) => {
                    const orderA = a.order !== undefined ? a.order : a.id;
                    const orderB = b.order !== undefined ? b.order : b.id;
                    return orderA - orderB;
                });
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async updateTopicsOrder(topicsOrderData) {
        await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['topics'], 'readwrite');
            const store = transaction.objectStore('topics');
            
            let completed = 0;
            const total = topicsOrderData.length;
            if (total === 0) return resolve();

            let hasError = false;

            topicsOrderData.forEach(item => {
                const getReq = store.get(item.id);
                getReq.onsuccess = () => {
                    const topic = getReq.result;
                    if (topic) {
                        topic.order = item.order;
                        const putReq = store.put(topic);
                        putReq.onsuccess = () => {
                            completed++;
                            if (completed === total && !hasError) resolve();
                        };
                        putReq.onerror = () => { hasError = true; reject(putReq.error); };
                    } else {
                        completed++;
                        if (completed === total && !hasError) resolve();
                    }
                };
                getReq.onerror = () => { hasError = true; reject(getReq.error); };
            });
        });
    },

    async deleteTopic(id) {
        await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['topics'], 'readwrite');
            const store = transaction.objectStore('topics');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async renameTopic(id, newTitle) {
        await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['topics'], 'readwrite');
            const store = transaction.objectStore('topics');
            const getReq = store.get(id);
            
            getReq.onsuccess = () => {
                const topic = getReq.result;
                if(topic) {
                    topic.title = newTitle;
                    const putReq = store.put(topic);
                    putReq.onsuccess = () => resolve();
                    putReq.onerror = () => reject(putReq.error);
                } else {
                    reject(new Error("Topic not found"));
                }
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },
    
    async searchTopics(query) {
        await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['topics'], 'readonly');
            const store = transaction.objectStore('topics');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const q = query.toLowerCase();
                const results = request.result.filter(t => 
                    t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)
                );
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    },

    // --- Gallery ---
    async addGalleryImage(subject, base64Data) {
        await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['gallery'], 'readwrite');
            const store = transaction.objectStore('gallery');
            const request = store.add({ subject, data: base64Data, date: new Date().toISOString() });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getGalleryImages(subject) {
        await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['gallery'], 'readonly');
            const store = transaction.objectStore('gallery');
            const index = store.index('subject');
            const request = index.getAll(subject);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteGalleryImage(id) {
        await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['gallery'], 'readwrite');
            const store = transaction.objectStore('gallery');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

window.DB = DB;
