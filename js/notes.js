// Notes Page JavaScript - UPDATED WITH SUPABASE
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize notes page
    await initNotesPage();
    initMobileMenu();
    await loadNotes();
    initUploadNotesModal();
    initEditNotesModal();
    initDeleteNotesModal();
    initSearch();
    
    // Check admin status and update UI
    await updateAdminUI();
});

// Initialize mobile menu (reused from index.js)
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}

// Initialize notes page
async function initNotesPage() {
    // Initialize Supabase
    try {
        await db.initialize();
        console.log('Supabase initialized for notes page');
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        showToast('Failed to initialize database. Please check your internet connection.', 'error');
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreNotes);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Close modal on outside click
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.classList.remove('active');
                resetUploadForm();
            }
        });
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            modals.forEach(modal => {
                modal.classList.remove('active');
                resetUploadForm();
            });
        }
    });
}

// Load notes from all courses
async function loadNotes(searchQuery = '') {
    const notesGrid = document.getElementById('notesGrid');
    const emptyState = document.getElementById('emptyState');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if (!notesGrid || !emptyState) return;
    
    // Clear current notes (except empty state)
    notesGrid.innerHTML = '';
    
    // Get all courses from Supabase
    const courses = await db.getCourses();
    
    // Collect all notes from all courses
    let allNotes = [];
    
    courses.forEach((course, courseIndex) => {
        if (course.notes && course.notes.length > 0) {
            course.notes.forEach((note, noteIndex) => {
                allNotes.push({
                    ...note,
                    courseIndex: courseIndex,
                    noteIndex: noteIndex,
                    courseTitle: course.title,
                    courseId: course.id
                });
            });
        }
    });
    
    // Filter notes by search query if provided
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        allNotes = allNotes.filter(note => 
            note.name.toLowerCase().includes(query) ||
            (note.description && note.description.toLowerCase().includes(query)) ||
            note.courseTitle.toLowerCase().includes(query)
        );
    }
    
    // Store all notes for pagination
    window.allNotes = allNotes;
    window.currentNotesPage = 0;
    window.notesPerPage = 6;
    
    if (allNotes.length === 0) {
        // Show empty state
        emptyState.style.display = 'block';
        notesGrid.appendChild(emptyState);
        if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
    } else {
        // Hide empty state
        emptyState.style.display = 'none';
        
        // Show initial notes
        displayNotesPage(0);
        
        // Show/hide load more button
        if (loadMoreContainer) {
            if (allNotes.length > window.notesPerPage) {
                loadMoreContainer.classList.remove('hidden');
            } else {
                loadMoreContainer.classList.add('hidden');
            }
        }
    }
}

// Display a page of notes
function displayNotesPage(page) {
    const notesGrid = document.getElementById('notesGrid');
    const allNotes = window.allNotes || [];
    const notesPerPage = window.notesPerPage || 6;
    
    const startIndex = page * notesPerPage;
    const endIndex = Math.min(startIndex + notesPerPage, allNotes.length);
    const pageNotes = allNotes.slice(startIndex, endIndex);
    
    // Add notes to grid
    pageNotes.forEach(note => {
        const noteCard = createNoteCard(note);
        notesGrid.appendChild(noteCard);
    });
    
    window.currentNotesPage = page;
    
    // Update load more button visibility
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    if (loadMoreContainer) {
        if (endIndex < allNotes.length) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    }
}

// Load more notes
function loadMoreNotes() {
    const nextPage = window.currentNotesPage + 1;
    displayNotesPage(nextPage);
}

// Create a note card element
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.noteId = note.id;
    card.dataset.courseIndex = note.courseIndex;
    card.dataset.noteIndex = note.noteIndex;
    
    // Format date
    const noteDate = note.uploadedAt ? new Date(note.uploadedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) : 'Recently added';
    
    // Format file size
    const fileSize = note.size ? formatFileSize(note.size) : 'Size unknown';
    
    // Check if user is admin
    const isAdmin = window.currentUserIsAdmin || false;
    
    card.innerHTML = `
        <div class="note-card-header">
            ${isAdmin ? `
                <div class="note-card-actions">
                    <button class="action-btn edit-btn" onclick="openEditNotesModal(${note.courseIndex}, ${note.noteIndex})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="openDeleteNotesModal(${note.courseIndex}, ${note.noteIndex})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            ` : ''}
            
            <div class="note-card-icon">
                <i class="fas fa-file-alt"></i>
            </div>
            
            <h3 class="note-card-title">${escapeHtml(note.name)}</h3>
            <p class="note-card-description">${escapeHtml(note.description || 'No description provided.')}</p>
            
            <a href="course-details.html?course=${note.courseIndex}" class="note-card-course">
                <i class="fas fa-graduation-cap"></i>
                ${escapeHtml(note.courseTitle)}
            </a>
        </div>
        
        <div class="note-card-footer">
            <div class="note-meta">
                <div class="note-date">
                    <i class="far fa-calendar"></i>
                    ${noteDate}
                </div>
                <div class="note-size">
                    <i class="fas fa-file"></i>
                    ${fileSize}
                </div>
            </div>
            
            <div class="note-card-cta">
                <a href="course-details.html?course=${note.courseIndex}" class="btn btn-secondary">
                    <i class="fas fa-external-link-alt"></i>
                    View Course
                </a>
                <button class="btn btn-primary" onclick="downloadNote(${note.courseIndex}, ${note.noteIndex})">
                    <i class="fas fa-download"></i>
                    Download
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Check if user is admin
async function checkAdminStatus() {
    const authUser = await db.getAuth();
    return authUser && authUser.isLoggedIn && authUser.role === 'admin';
}

// Update UI based on admin status
async function updateAdminUI() {
    const isAdmin = await checkAdminStatus();
    const adminActionsContainer = document.getElementById('adminActionsContainer');
    
    // Store admin status globally
    window.currentUserIsAdmin = isAdmin;
    
    if (!adminActionsContainer) return;
    
    if (isAdmin) {
        adminActionsContainer.innerHTML = `
            <button class="btn btn-primary" id="uploadNotesBtn">
                <i class="fas fa-plus-circle"></i>
                Upload Notes
            </button>
        `;
        
        // Add event listener to the button
        const uploadNotesBtn = document.getElementById('uploadNotesBtn');
        if (uploadNotesBtn) {
            uploadNotesBtn.addEventListener('click', function() {
                openUploadNotesModal();
            });
        }
    } else {
        adminActionsContainer.innerHTML = '';
    }
}

// Initialize upload notes modal
function initUploadNotesModal() {
    const uploadNotesModal = document.getElementById('uploadNotesModal');
    const closeUploadNotesModal = document.getElementById('closeUploadNotesModal');
    const cancelUploadNotesModal = document.getElementById('cancelUploadNotesModal');
    const uploadNotesForm = document.getElementById('uploadNotesForm');
    const notesFileInput = document.getElementById('notesFile');
    
    if (closeUploadNotesModal) {
        closeUploadNotesModal.addEventListener('click', function() {
            uploadNotesModal.classList.remove('active');
            resetUploadForm();
        });
    }
    
    if (cancelUploadNotesModal) {
        cancelUploadNotesModal.addEventListener('click', function() {
            uploadNotesModal.classList.remove('active');
            resetUploadForm();
        });
    }
    
    if (uploadNotesForm) {
        uploadNotesForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            await handleNotesUpload();
        });
    }
    
    if (notesFileInput) {
        notesFileInput.addEventListener('change', function() {
            updateNotesFilePreview();
        });
    }
}

// Initialize edit notes modal
function initEditNotesModal() {
    const editNotesModal = document.getElementById('editNotesModal');
    const closeEditNotesModal = document.getElementById('closeEditNotesModal');
    const cancelEditNotesModal = document.getElementById('cancelEditNotesModal');
    const editNotesForm = document.getElementById('editNotesForm');
    const editNotesFileInput = document.getElementById('editNotesFile');
    
    if (closeEditNotesModal) {
        closeEditNotesModal.addEventListener('click', function() {
            editNotesModal.classList.remove('active');
            resetUploadForm();
        });
    }
    
    if (cancelEditNotesModal) {
        cancelEditNotesModal.addEventListener('click', function() {
            editNotesModal.classList.remove('active');
            resetUploadForm();
        });
    }
    
    if (editNotesForm) {
        editNotesForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            await handleNotesEdit();
        });
    }
    
    if (editNotesFileInput) {
        editNotesFileInput.addEventListener('change', function() {
            updateEditNotesFilePreview();
        });
    }
}

// Initialize delete notes modal
function initDeleteNotesModal() {
    const deleteNotesModal = document.getElementById('deleteNotesModal');
    const closeDeleteNotesModal = document.getElementById('closeDeleteNotesModal');
    const cancelDeleteNotesBtn = document.getElementById('cancelDeleteNotesBtn');
    
    if (closeDeleteNotesModal) {
        closeDeleteNotesModal.addEventListener('click', function() {
            deleteNotesModal.classList.remove('active');
        });
    }
    
    if (cancelDeleteNotesBtn) {
        cancelDeleteNotesBtn.addEventListener('click', function() {
            deleteNotesModal.classList.remove('active');
        });
    }
    
    // Confirm delete button is handled in openDeleteNotesModal
}

// Initialize search functionality
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        // Search on input with debounce
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const query = searchInput.value.trim();
                await loadNotes(query);
            }, 300);
        });
        
        // Clear search
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', async function() {
                searchInput.value = '';
                await loadNotes('');
            });
        }
    }
}

// Open upload notes modal
async function openUploadNotesModal() {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showAuthModal();
        return;
    }
    
    const uploadNotesModal = document.getElementById('uploadNotesModal');
    const notesCourseSelect = document.getElementById('notesCourse');
    
    // Populate course dropdown
    await populateCourseDropdown(notesCourseSelect);
    
    // Show modal
    uploadNotesModal.classList.add('active');
}

// Open edit notes modal
async function openEditNotesModal(courseIndex, noteIndex) {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showAuthModal();
        return;
    }
    
    // Get courses from Supabase
    const courses = await db.getCourses();
    
    if (courseIndex < 0 || courseIndex >= courses.length) {
        showToast('Course not found', 'error');
        return;
    }
    
    const course = courses[courseIndex];
    
    if (!course.notes || noteIndex < 0 || noteIndex >= course.notes.length) {
        showToast('Notes not found', 'error');
        return;
    }
    
    const note = course.notes[noteIndex];
    const editNotesModal = document.getElementById('editNotesModal');
    const editNotesCourseSelect = document.getElementById('editNotesCourse');
    
    // Populate course dropdown
    await populateCourseDropdown(editNotesCourseSelect, courseIndex);
    
    // Set form values
    document.getElementById('editNotesId').value = note.id;
    document.getElementById('editCourseIndex').value = courseIndex;
    document.getElementById('editNotesIndex').value = noteIndex;
    document.getElementById('editNotesTitle').value = note.name;
    document.getElementById('editNotesDescription').value = note.description || '';
    
    // Set current file preview
    const currentNotesPreview = document.getElementById('currentNotesPreview');
    currentNotesPreview.innerHTML = `
        <div class="file-preview-content">
            <div class="file-preview-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="file-preview-info">
                <div class="file-preview-name">${escapeHtml(note.name)}</div>
                <div class="file-preview-size">${note.size ? formatFileSize(note.size) : 'Size unknown'}</div>
            </div>
        </div>
    `;
    
    // Show modal
    editNotesModal.classList.add('active');
}

// Open delete notes modal
async function openDeleteNotesModal(courseIndex, noteIndex) {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showAuthModal();
        return;
    }
    
    // Get courses from Supabase
    const courses = await db.getCourses();
    
    if (courseIndex < 0 || courseIndex >= courses.length) {
        showToast('Course not found', 'error');
        return;
    }
    
    const course = courses[courseIndex];
    
    if (!course.notes || noteIndex < 0 || noteIndex >= course.notes.length) {
        showToast('Notes not found', 'error');
        return;
    }
    
    const note = course.notes[noteIndex];
    const deleteNotesModal = document.getElementById('deleteNotesModal');
    const deleteNotesName = document.getElementById('deleteNotesName');
    const confirmDeleteNotesBtn = document.getElementById('confirmDeleteNotesBtn');
    
    // Set notes name for confirmation
    deleteNotesName.textContent = note.name;
    
    // Set up confirm delete button
    confirmDeleteNotesBtn.onclick = async function() {
        await deleteNote(courseIndex, noteIndex);
    };
    
    // Show modal
    deleteNotesModal.classList.add('active');
}

// Populate course dropdown
async function populateCourseDropdown(selectElement, selectedIndex = null) {
    const courses = await db.getCourses();
    
    // Clear existing options except the first one
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    
    // Add course options
    courses.forEach((course, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = course.title;
        if (selectedIndex !== null && index === selectedIndex) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

// Handle notes upload
async function handleNotesUpload() {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showAuthModal();
        return;
    }
    
    const notesTitle = document.getElementById('notesTitle').value.trim();
    const notesDescription = document.getElementById('notesDescription').value.trim();
    const notesCourseIndex = parseInt(document.getElementById('notesCourse').value);
    const notesFileInput = document.getElementById('notesFile');
    
    if (!notesTitle || !notesDescription || isNaN(notesCourseIndex)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (!notesFileInput.files || notesFileInput.files.length === 0) {
        showToast('Please select a file to upload', 'error');
        return;
    }
    
    const file = notesFileInput.files[0];
    
    if (!file.type.includes('pdf')) {
        showToast('Only PDF files are supported', 'error');
        return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }
    
    // Get courses from Supabase
    const courses = await db.getCourses();
    
    if (notesCourseIndex < 0 || notesCourseIndex >= courses.length) {
        showToast('Selected course not found', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const newNote = {
            id: Date.now(),
            name: notesTitle,
            description: notesDescription,
            data: e.target.result,
            size: file.size,
            uploadedAt: new Date().toISOString()
        };
        
        // Add note to course
        if (!courses[notesCourseIndex].notes) {
            courses[notesCourseIndex].notes = [];
        }
        
        courses[notesCourseIndex].notes.push(newNote);
        
        // Update course timestamp
        courses[notesCourseIndex].updatedAt = new Date().toISOString();
        
        // Save to Supabase
        const result = await db.saveCourses(courses);
        
        if (result.success) {
            // Close modal and reset form
            document.getElementById('uploadNotesModal').classList.remove('active');
            resetUploadForm();
            
            // Show success message
            showToast('Notes uploaded successfully', 'success');
            
            // Reload notes
            await loadNotes();
        } else {
            showToast('Failed to upload notes: ' + result.error, 'error');
        }
    };
    
    reader.readAsDataURL(file);
}

// Handle notes edit
async function handleNotesEdit() {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showAuthModal();
        return;
    }
    
    const noteId = document.getElementById('editNotesId').value;
    const courseIndex = parseInt(document.getElementById('editCourseIndex').value);
    const noteIndex = parseInt(document.getElementById('editNotesIndex').value);
    const newCourseIndex = parseInt(document.getElementById('editNotesCourse').value);
    const notesTitle = document.getElementById('editNotesTitle').value.trim();
    const notesDescription = document.getElementById('editNotesDescription').value.trim();
    const notesFileInput = document.getElementById('editNotesFile');
    
    if (!notesTitle || !notesDescription || isNaN(newCourseIndex)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Get courses from Supabase
    const courses = await db.getCourses();
    
    if (courseIndex < 0 || courseIndex >= courses.length ||
        newCourseIndex < 0 || newCourseIndex >= courses.length) {
        showToast('Course not found', 'error');
        return;
    }
    
    const course = courses[courseIndex];
    
    if (!course.notes || noteIndex < 0 || noteIndex >= course.notes.length) {
        showToast('Notes not found', 'error');
        return;
    }
    
    const note = course.notes[noteIndex];
    
    // Update note properties
    note.name = notesTitle;
    note.description = notesDescription;
    
    // If a new file was selected, update it
    if (notesFileInput.files && notesFileInput.files.length > 0) {
        const file = notesFileInput.files[0];
        
        if (!file.type.includes('pdf')) {
            showToast('Only PDF files are supported', 'error');
            return;
        }
        
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            showToast('File size must be less than 10MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            note.data = e.target.result;
            note.size = file.size;
            note.uploadedAt = new Date().toISOString();
            
            // Move note to new course if course changed
            if (courseIndex !== newCourseIndex) {
                await moveNoteToNewCourse(courses, courseIndex, noteIndex, newCourseIndex, note);
            } else {
                await saveCoursesAndUpdate(courses);
            }
        };
        reader.readAsDataURL(file);
    } else {
        // Move note to new course if course changed
        if (courseIndex !== newCourseIndex) {
            await moveNoteToNewCourse(courses, courseIndex, noteIndex, newCourseIndex, note);
        } else {
            await saveCoursesAndUpdate(courses);
        }
    }
}

// Move note to new course
async function moveNoteToNewCourse(courses, oldCourseIndex, noteIndex, newCourseIndex, note) {
    // Remove note from old course
    courses[oldCourseIndex].notes.splice(noteIndex, 1);
    
    // Update old course timestamp
    courses[oldCourseIndex].updatedAt = new Date().toISOString();
    
    // Add note to new course
    if (!courses[newCourseIndex].notes) {
        courses[newCourseIndex].notes = [];
    }
    
    courses[newCourseIndex].notes.push(note);
    
    // Update new course timestamp
    courses[newCourseIndex].updatedAt = new Date().toISOString();
    
    await saveCoursesAndUpdate(courses);
}

// Save courses and update UI
async function saveCoursesAndUpdate(courses) {
    // Save to Supabase
    const result = await db.saveCourses(courses);
    
    if (result.success) {
        // Close modal and reset form
        document.getElementById('editNotesModal').classList.remove('active');
        resetUploadForm();
        
        // Show success message
        showToast('Notes updated successfully', 'success');
        
        // Reload notes
        await loadNotes();
    } else {
        showToast('Failed to update notes: ' + result.error, 'error');
    }
}

// Delete note
async function deleteNote(courseIndex, noteIndex) {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showAuthModal();
        return;
    }
    
    // Get courses from Supabase
    const courses = await db.getCourses();
    
    if (courseIndex < 0 || courseIndex >= courses.length) {
        showToast('Course not found', 'error');
        return;
    }
    
    const course = courses[courseIndex];
    
    if (!course.notes || noteIndex < 0 || noteIndex >= course.notes.length) {
        showToast('Notes not found', 'error');
        return;
    }
    
    // Remove note
    course.notes.splice(noteIndex, 1);
    
    // Update course timestamp
    course.updatedAt = new Date().toISOString();
    
    // Save to Supabase
    const result = await db.saveCourses(courses);
    
    if (result.success) {
        // Close modal
        document.getElementById('deleteNotesModal').classList.remove('active');
        
        // Show success message
        showToast('Notes deleted successfully', 'success');
        
        // Reload notes
        await loadNotes();
    } else {
        showToast('Failed to delete notes: ' + result.error, 'error');
    }
}

// Download note
async function downloadNote(courseIndex, noteIndex) {
    // Get courses from Supabase
    const courses = await db.getCourses();
    
    if (courseIndex < 0 || courseIndex >= courses.length) {
        showToast('Course not found', 'error');
        return;
    }
    
    const course = courses[courseIndex];
    
    if (!course.notes || noteIndex < 0 || noteIndex >= course.notes.length) {
        showToast('Notes not found', 'error');
        return;
    }
    
    const note = course.notes[noteIndex];
    
    if (!note.data) {
        showToast('File data is missing', 'error');
        return;
    }
    
    // Create download link
    const link = document.createElement('a');
    link.href = note.data;
    link.download = `${note.name}.pdf`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Download started', 'success');
}

// Update notes file preview
function updateNotesFilePreview() {
    const notesFileInput = document.getElementById('notesFile');
    const notesFilePreview = document.getElementById('notesFilePreview');
    
    if (notesFileInput.files && notesFileInput.files.length > 0) {
        const file = notesFileInput.files[0];
        
        notesFilePreview.innerHTML = `
            <div class="file-preview-content">
                <div class="file-preview-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="file-preview-info">
                    <div class="file-preview-name">${escapeHtml(file.name)}</div>
                    <div class="file-preview-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        `;
        notesFilePreview.classList.add('has-file');
    } else {
        notesFilePreview.innerHTML = '';
        notesFilePreview.classList.remove('has-file');
    }
}

// Update edit notes file preview
function updateEditNotesFilePreview() {
    const editNotesFileInput = document.getElementById('editNotesFile');
    
    if (editNotesFileInput.files && editNotesFileInput.files.length > 0) {
        const file = editNotesFileInput.files[0];
        
        // Update the current file preview
        const currentNotesPreview = document.getElementById('currentNotesPreview');
        currentNotesPreview.innerHTML = `
            <div class="file-preview-content">
                <div class="file-preview-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="file-preview-info">
                    <div class="file-preview-name">${escapeHtml(file.name)} (New file)</div>
                    <div class="file-preview-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        `;
    }
}

// Reset upload form
function resetUploadForm() {
    const forms = ['uploadNotesForm', 'editNotesForm'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.reset();
    });
    
    const previews = ['notesFilePreview', 'currentNotesPreview'];
    previews.forEach(previewId => {
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.innerHTML = '';
            preview.classList.remove('has-file');
        }
    });
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Show authentication required modal
function showAuthModal() {
    if (typeof window.showAuthModal === 'function') {
        window.showAuthModal();
    } else {
        // Fallback: redirect to admin page
        window.location.href = 'admin.html';
    }
}

// Show toast message
function showToast(message, type = 'info') {
    const toast = document.getElementById('messageToast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon');
    
    if (!toast || !toastMessage) return;
    
    // Set message
    toastMessage.textContent = message;
    
    // Set icon based on type
    toastIcon.className = 'toast-icon';
    if (type === 'success') {
        toastIcon.classList.add('fas', 'fa-check-circle');
        toastIcon.style.color = 'var(--accent-secondary)';
    } else if (type === 'error') {
        toastIcon.classList.add('fas', 'fa-exclamation-circle');
        toastIcon.style.color = 'var(--accent-error)';
    } else {
        toastIcon.classList.add('fas', 'fa-info-circle');
        toastIcon.style.color = 'var(--accent-primary)';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for global use
window.CodeNirvahana = window.CodeNirvahana || {};
window.CodeNirvahana.notes = {
    loadNotes: loadNotes,
    checkAdminStatus: checkAdminStatus
};