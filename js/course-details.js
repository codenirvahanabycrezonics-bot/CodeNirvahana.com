// course-detail.js - UPDATED WITH SUPABASE INTEGRATION

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Course Detail Page Initializing...');
    initMobileMenu();
    await initCourseDetailPage();
});

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

async function initCourseDetailPage() {
    console.log('Initializing course detail page...');
    
    // Initialize Supabase
    try {
        await db.initialize();
        console.log('Supabase initialized for course detail page');
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        showToast('Failed to initialize database. Please check your internet connection.', 'error');
    }
    
    // Initialize all components
    await loadCourseData();
    initPlaylist();
    initVideoUploadForm();
    initVideoEditForm();
    initDeleteModal();
    initEventListeners();
    await checkAdminStatus();
    
    console.log('Course detail page initialized');
}

async function loadCourseData() {
    console.log('Loading course data...');
    
    // Get active course from localStorage
    const activeCourseId = localStorage.getItem('activeCourseId');
    console.log('Active Course ID:', activeCourseId);
    
    if (!activeCourseId || activeCourseId === 'null' || activeCourseId === 'undefined') {
        console.error('No active course ID found in localStorage');
        showEmptyCourseState();
        return;
    }
    
    const courses = await db.getCourses();
    console.log('Total courses:', courses.length);
    
    const courseIndex = parseInt(activeCourseId);
    console.log('Course index to load:', courseIndex);
    
    if (isNaN(courseIndex) || courseIndex < 0 || courseIndex >= courses.length) {
        console.error('Invalid course index:', courseIndex);
        showEmptyCourseState();
        return;
    }
    
    const course = courses[courseIndex];
    console.log('Loaded course:', course);
    
    if (!course) {
        console.error('Course not found at index:', courseIndex);
        showEmptyCourseState();
        return;
    }
    
    // Update course info
    updateCourseInfo(course, courseIndex);
    
    // Load playlist
    loadPlaylist(course, courseIndex);
    
    // Update stats
    await updateCourseStats(course);
}

function showEmptyCourseState() {
    console.log('Showing empty course state');
    
    const courseTitle = document.getElementById('courseTitle');
    const courseDescription = document.getElementById('courseDescription');
    const courseThumbnail = document.getElementById('courseThumbnail');
    const playlistContainer = document.getElementById('playlistContainer');
    
    courseTitle.textContent = 'Course Not Found';
    courseDescription.textContent = 'The requested course could not be loaded. Please return to the courses page and select a valid course.';
    
    // Clear thumbnail
    courseThumbnail.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
    courseThumbnail.style.background = 'linear-gradient(135deg, #ef4444, rgba(239, 68, 68, 0.2))';
    
    // Show empty playlist
    playlistContainer.innerHTML = `
        <div class="playlist-empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <h4>Course Not Available</h4>
            <p>This course could not be loaded.</p>
        </div>
    `;
    
    // Hide video player
    const videoEmptyState = document.getElementById('videoEmptyState');
    const youtubePlayer = document.getElementById('youtubePlayer');
    
    if (videoEmptyState) videoEmptyState.style.display = 'flex';
    if (youtubePlayer) {
        youtubePlayer.style.display = 'none';
        youtubePlayer.src = '';
    }
    
    // Hide resources
    const resourcesGrid = document.querySelector('.resources-grid');
    const resourcesEmptyState = document.querySelector('.resources-empty-state');
    
    if (resourcesGrid) resourcesGrid.style.display = 'none';
    if (resourcesEmptyState) resourcesEmptyState.style.display = 'flex';
    
    // Update stats to zero
    document.getElementById('totalVideos').textContent = '0';
    document.getElementById('watchedVideos').textContent = '0';
}

function updateCourseInfo(course, courseIndex) {
    console.log('Updating course info for:', course.title);
    
    const courseTitle = document.getElementById('courseTitle');
    const courseDescription = document.getElementById('courseDescription');
    const courseThumbnail = document.getElementById('courseThumbnail');
    
    courseTitle.textContent = course.title || 'Untitled Course';
    courseDescription.textContent = course.description || 'No description available.';
    
    // Update thumbnail
    if (course.thumbnail && course.thumbnail.startsWith('data:image')) {
        courseThumbnail.innerHTML = `<img src="${course.thumbnail}" alt="${course.title}">`;
    } else {
        courseThumbnail.innerHTML = '<i class="fas fa-graduation-cap"></i>';
        courseThumbnail.style.background = 'linear-gradient(135deg, #38bdf8, rgba(56, 189, 248, 0.2))';
    }
    
    // Store course index for later use
    window.currentCourseIndex = courseIndex;
}

async function loadPlaylist(course, courseIndex) {
    console.log('Loading playlist for course:', course.title);
    
    const playlistContainer = document.getElementById('playlistContainer');
    const videos = course.videos || [];
    
    console.log('Number of videos:', videos.length);
    
    if (videos.length === 0) {
        playlistContainer.innerHTML = `
            <div class="playlist-empty-state">
                <i class="fas fa-video-slash"></i>
                <h4>No Videos Available</h4>
                <p>This course doesn't have any videos yet.</p>
            </div>
        `;
        return;
    }
    
    // Get watched videos for this course
    const watchedVideos = await db.getWatchedVideos();
    const courseWatched = watchedVideos[course.id] || [];
    console.log('Watched videos for this course:', courseWatched);
    
    // Clear playlist container
    playlistContainer.innerHTML = '';
    
    // Create playlist items
    videos.forEach((video, index) => {
        const isWatched = courseWatched.includes(video.videoId || video.id);
        const hasNotes = video.notes && video.notes.data;
        const hasAssignment = video.assignment && video.assignment.data;
        const hasCode = video.code && video.code.data;
        const isAdmin = window.currentUserIsAdmin || false;
        
        const playlistItem = document.createElement('div');
        playlistItem.className = `playlist-item ${isWatched ? 'watched' : ''}`;
        playlistItem.dataset.videoIndex = index;
        
        // Create admin actions if user is admin
        const adminActions = isAdmin ? `
            <div class="playlist-item-actions">
                <button class="playlist-item-action-btn playlist-edit-btn" onclick="openEditVideoModal(${index})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="playlist-item-action-btn playlist-delete-btn" onclick="openDeleteVideoModal(${index})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        ` : '';
        
        playlistItem.innerHTML = `
            <div class="playlist-item-icon">
                <i class="fas fa-play"></i>
            </div>
            <div class="playlist-item-content">
                <h4 class="playlist-item-title">${escapeHtml(video.title)}</h4>
                <p class="playlist-item-description">${escapeHtml(video.description || 'No description')}</p>
                <div class="playlist-item-meta">
                    ${hasNotes ? '<span class="resource-badge"><i class="fas fa-file-alt"></i> Notes</span>' : ''}
                    ${hasAssignment ? '<span class="resource-badge"><i class="fas fa-tasks"></i> Assignment</span>' : ''}
                    ${hasCode ? '<span class="resource-badge"><i class="fas fa-code"></i> Code</span>' : ''}
                </div>
            </div>
            ${adminActions}
        `;
        
        // Add click event for loading video
        playlistItem.addEventListener('click', function(event) {
            // Don't trigger if clicking on admin buttons
            if (!event.target.closest('.playlist-item-actions')) {
                console.log('Loading video:', video.title);
                loadVideo(video, course, index);
            }
        });
        
        playlistContainer.appendChild(playlistItem);
    });
    
    // Load first video by default
    if (videos.length > 0) {
        console.log('Loading first video:', videos[0].title);
        loadVideo(videos[0], course, 0);
        
        // Mark first video as active
        const firstItem = playlistContainer.querySelector('.playlist-item');
        if (firstItem) {
            firstItem.classList.add('active');
        }
    }
}

async function loadVideo(video, course, videoIndex) {
    console.log('Loading video into player:', video.title);
    
    const youtubePlayer = document.getElementById('youtubePlayer');
    const videoEmptyState = document.getElementById('videoEmptyState');
    const resourcesGrid = document.querySelector('.resources-grid');
    const resourcesEmptyState = document.querySelector('.resources-empty-state');
    
    // Extract YouTube video ID
    const videoId = extractYouTubeId(video.youtubeUrl || video.url);
    console.log('YouTube Video ID:', videoId);
    
    if (videoId) {
        // Update YouTube iframe
        youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0`;
        youtubePlayer.style.display = 'block';
        videoEmptyState.style.display = 'none';
    } else {
        // Show error state
        youtubePlayer.style.display = 'none';
        videoEmptyState.style.display = 'flex';
        videoEmptyState.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <h3>Invalid Video URL</h3>
            <p>The video URL is not valid. Please check the video configuration.</p>
        `;
    }
    
    // Update active playlist item
    updateActivePlaylistItem(videoIndex);
    
    // Mark video as watched
    if (course && course.id && (video.videoId || video.id)) {
        await markVideoAsWatched(course.id, video.videoId || video.id);
    }
    
    // Update resources section
    updateResourcesSection(video);
    
    // Store current video data for later use
    window.currentVideo = video;
    window.currentVideoIndex = videoIndex;
}

function extractYouTubeId(url) {
    if (!url) return null;
    
    console.log('Extracting YouTube ID from:', url);
    
    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            console.log('Found YouTube ID:', match[1]);
            return match[1];
        }
    }
    
    // Check if it's already a video ID (11 characters)
    if (url.length === 11 && !url.includes('/') && !url.includes('.')) {
        console.log('Input appears to be a YouTube ID:', url);
        return url;
    }
    
    console.log('No YouTube ID found');
    return null;
}

function updateActivePlaylistItem(activeIndex) {
    const playlistItems = document.querySelectorAll('.playlist-item');
    playlistItems.forEach((item, index) => {
        if (index === activeIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

async function markVideoAsWatched(courseId, videoId) {
    if (!courseId || !videoId) {
        console.error('Cannot mark video as watched: missing courseId or videoId');
        return;
    }
    
    console.log('Marking video as watched:', { courseId, videoId });
    
    const watchedVideos = await db.getWatchedVideos();
    
    if (!watchedVideos[courseId]) {
        watchedVideos[courseId] = [];
    }
    
    if (!watchedVideos[courseId].includes(videoId)) {
        watchedVideos[courseId].push(videoId);
        await db.saveWatchedVideos(watchedVideos);
        console.log('Video marked as watched');
        
        // Update stats
        const courses = await db.getCourses();
        const activeCourseId = localStorage.getItem('activeCourseId');
        const courseIndex = parseInt(activeCourseId);
        
        if (!isNaN(courseIndex) && courseIndex >= 0 && courseIndex < courses.length) {
            await updateCourseStats(courses[courseIndex]);
        }
    }
}

async function updateCourseStats(course) {
    console.log('Updating course stats for:', course.title);
    
    const totalVideos = course.videos ? course.videos.length : 0;
    const watchedVideos = await db.getWatchedVideos();
    const courseWatched = watchedVideos[course.id] || [];
    const watchedCount = courseWatched.length;
    
    console.log('Stats:', { totalVideos, watchedCount });
    
    document.getElementById('totalVideos').textContent = totalVideos;
    document.getElementById('watchedVideos').textContent = watchedCount;
}

function updateResourcesSection(video) {
    console.log('Updating resources section for video:', video.title);
    
    const resourcesGrid = document.querySelector('.resources-grid');
    const resourcesEmptyState = document.querySelector('.resources-empty-state');
    
    if (!video.notes && !video.assignment && !video.code) {
        // No resources available
        resourcesGrid.style.display = 'none';
        resourcesEmptyState.style.display = 'flex';
        return;
    }
    
    // Show resources grid
    resourcesGrid.style.display = 'grid';
    resourcesEmptyState.style.display = 'none';
    
    // Update notes resource
    const notesResource = document.getElementById('notesResource');
    const notesDescription = document.getElementById('notesDescription');
    
    if (video.notes) {
        notesResource.style.display = 'flex';
        notesDescription.textContent = `${video.notes.name || 'Notes'} (${formatFileSize(video.notes.size)})`;
    } else {
        notesResource.style.display = 'none';
    }
    
    // Update assignment resource
    const assignmentResource = document.getElementById('assignmentResource');
    const assignmentDescription = document.getElementById('assignmentDescription');
    
    if (video.assignment) {
        assignmentResource.style.display = 'flex';
        assignmentDescription.textContent = `${video.assignment.name || 'Assignment'} (${formatFileSize(video.assignment.size)})`;
    } else {
        assignmentResource.style.display = 'none';
    }
    
    // Update code resource
    const codeResource = document.getElementById('codeResource');
    const codeDescription = document.getElementById('codeDescription');
    
    if (video.code) {
        codeResource.style.display = 'flex';
        codeDescription.textContent = `${video.code.name || 'Code Files'} (${formatFileSize(video.code.size)})`;
    } else {
        codeResource.style.display = 'none';
    }
}

function initPlaylist() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshPlaylist');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            console.log('Refreshing playlist...');
            await loadCourseData();
            showToast('Playlist refreshed', 'success');
        });
    }
}

function initVideoUploadForm() {
    console.log('Initializing video upload form...');
    
    const videoUploadForm = document.getElementById('videoUploadForm');
    const resetUploadForm = document.getElementById('resetUploadForm');
    const fileInputs = ['notesFile', 'assignmentFile', 'codeFile'];
    
    if (videoUploadForm) {
        videoUploadForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log('Video upload form submitted');
            await handleVideoUpload();
        });
    }
    
    if (resetUploadForm) {
        resetUploadForm.addEventListener('click', function() {
            console.log('Resetting upload form');
            resetUploadFormFields();
        });
    }
    
    // File preview handlers
    fileInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        const previewId = inputId + 'Preview';
        const preview = document.getElementById(previewId);
        
        if (input && preview) {
            input.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const file = this.files[0];
                    preview.innerHTML = `
                        <i class="fas fa-file"></i>
                        ${escapeHtml(file.name)} (${formatFileSize(file.size)})
                    `;
                    preview.style.display = 'flex';
                } else {
                    preview.innerHTML = '';
                    preview.style.display = 'none';
                }
            });
        }
    });
}

function initVideoEditForm() {
    console.log('Initializing video edit form...');
    
    const editVideoForm = document.getElementById('editVideoForm');
    const toggleEditForm = document.getElementById('toggleEditForm');
    const resetEditForm = document.getElementById('resetEditForm');
    const deleteVideoBtn = document.getElementById('deleteVideoBtn');
    
    // Toggle edit form
    if (toggleEditForm) {
        toggleEditForm.addEventListener('click', function() {
            document.getElementById('editVideoSection').style.display = 'none';
            resetEditFormFields();
        });
    }
    
    // Reset edit form
    if (resetEditForm) {
        resetEditForm.addEventListener('click', async function() {
            const videoIndex = document.getElementById('editVideoIndex').value;
            if (videoIndex) {
                await loadVideoIntoEditForm(parseInt(videoIndex));
            }
        });
    }
    
    // Delete video button
    if (deleteVideoBtn) {
        deleteVideoBtn.addEventListener('click', function() {
            const videoIndex = document.getElementById('editVideoIndex').value;
            if (videoIndex) {
                openDeleteVideoModal(parseInt(videoIndex));
            }
        });
    }
    
    // Edit form submission
    if (editVideoForm) {
        editVideoForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log('Video edit form submitted');
            await handleVideoEdit();
        });
    }
    
    // File change handlers for edit form
    ['editNotesFile', 'editAssignmentFile', 'editCodeFile'].forEach(inputId => {
        const input = document.getElementById(inputId);
        const previewId = inputId + 'Preview';
        const preview = document.getElementById(previewId);
        
        if (input && preview) {
            input.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const file = this.files[0];
                    preview.innerHTML = `
                        <i class="fas fa-file"></i>
                        ${escapeHtml(file.name)} (${formatFileSize(file.size)})
                        <span style="color: var(--accent-secondary); font-size: 0.75rem; margin-left: 8px;">
                            <i class="fas fa-sync-alt"></i> New file
                        </span>
                    `;
                    preview.style.display = 'flex';
                } else {
                    preview.innerHTML = '';
                    preview.style.display = 'none';
                }
            });
        }
    });
}

function initDeleteModal() {
    console.log('Initializing delete modal...');
    
    const deleteModal = document.getElementById('deleteConfirmModal');
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteVideoBtn');
    
    // Close modal buttons
    if (closeDeleteModal) {
        closeDeleteModal.addEventListener('click', function() {
            deleteModal.classList.remove('active');
        });
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function() {
            deleteModal.classList.remove('active');
        });
    }
    
    // Confirm delete button (handled in openDeleteVideoModal)
    
    // Close modal on outside click
    if (deleteModal) {
        deleteModal.addEventListener('click', function(event) {
            if (event.target === deleteModal) {
                deleteModal.classList.remove('active');
            }
        });
    }
    
    // Close modal on escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            deleteModal.classList.remove('active');
        }
    });
}

async function openEditVideoModal(videoIndex) {
    console.log('Opening edit modal for video index:', videoIndex);
    
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    // Hide other forms
    document.getElementById('adminUploadSection').style.display = 'none';
    
    // Show edit form
    document.getElementById('editVideoSection').style.display = 'block';
    
    // Load video data into form
    await loadVideoIntoEditForm(videoIndex);
}

async function loadVideoIntoEditForm(videoIndex) {
    console.log('Loading video data into edit form for index:', videoIndex);
    
    const activeCourseId = localStorage.getItem('activeCourseId');
    if (!activeCourseId) return;
    
    const courses = await db.getCourses();
    const courseIndex = parseInt(activeCourseId);
    
    if (isNaN(courseIndex) || courseIndex < 0 || courseIndex >= courses.length) return;
    
    const course = courses[courseIndex];
    const videos = course.videos || [];
    
    if (videoIndex < 0 || videoIndex >= videos.length) return;
    
    const video = videos[videoIndex];
    
    // Set form values
    document.getElementById('editVideoIndex').value = videoIndex;
    document.getElementById('editVideoId').value = video.videoId || video.id;
    document.getElementById('editVideoTitle').value = video.title || '';
    document.getElementById('editVideoDescription').value = video.description || '';
    document.getElementById('editYoutubeUrl').value = video.youtubeUrl || video.url || '';
    
    // Show delete button
    document.getElementById('deleteVideoBtn').style.display = 'flex';
    
    // Update current file previews
    updateCurrentFilePreview('notes', video.notes, 'currentNotesPreview', 'currentNotesInfo');
    updateCurrentFilePreview('assignment', video.assignment, 'currentAssignmentPreview', 'currentAssignmentInfo');
    updateCurrentFilePreview('code', video.code, 'currentCodePreview', 'currentCodeInfo');
    
    // Clear new file previews
    ['editNotesPreview', 'editAssignmentPreview', 'editCodePreview'].forEach(previewId => {
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.innerHTML = '';
            preview.style.display = 'none';
        }
    });
    
    // Clear file inputs
    ['editNotesFile', 'editAssignmentFile', 'editCodeFile'].forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
        }
    });
}

function updateCurrentFilePreview(type, fileData, previewId, infoId) {
    const preview = document.getElementById(previewId);
    const info = document.getElementById(infoId);
    
    if (!preview || !info) return;
    
    if (fileData) {
        preview.innerHTML = `
            <i class="fas fa-file"></i>
            ${escapeHtml(fileData.name)} (${formatFileSize(fileData.size)})
        `;
        preview.style.display = 'flex';
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-secondary file-action-btn remove-file-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i> Remove';
        removeBtn.onclick = async function() {
            await removeFileFromVideo(type);
        };
        
        // Clear existing actions and add new one
        const actionsDiv = document.querySelector(`#${infoId} .file-actions`);
        if (actionsDiv) {
            actionsDiv.innerHTML = '';
            actionsDiv.appendChild(removeBtn);
        } else {
            const newActionsDiv = document.createElement('div');
            newActionsDiv.className = 'file-actions';
            newActionsDiv.appendChild(removeBtn);
            info.appendChild(newActionsDiv);
        }
    } else {
        preview.innerHTML = '<i class="fas fa-file"></i> No file uploaded';
        preview.style.display = 'flex';
        
        // Clear actions
        const actionsDiv = document.querySelector(`#${infoId} .file-actions`);
        if (actionsDiv) {
            actionsDiv.innerHTML = '';
        }
    }
}

async function removeFileFromVideo(type) {
    console.log('Removing file:', type);
    
    const videoIndex = document.getElementById('editVideoIndex').value;
    if (!videoIndex) return;
    
    const activeCourseId = localStorage.getItem('activeCourseId');
    if (!activeCourseId) return;
    
    const courses = await db.getCourses();
    const courseIndex = parseInt(activeCourseId);
    
    if (isNaN(courseIndex) || courseIndex < 0 || courseIndex >= courses.length) return;
    
    const course = courses[courseIndex];
    const videos = course.videos || [];
    
    if (videoIndex < 0 || videoIndex >= videos.length) return;
    
    // Remove the file
    delete videos[videoIndex][type];
    
    // Save changes
    await db.saveCourses(courses);
    
    // Update preview
    updateCurrentFilePreview(type, null, 
        `current${type.charAt(0).toUpperCase() + type.slice(1)}Preview`,
        `current${type.charAt(0).toUpperCase() + type.slice(1)}Info`);
    
    // If removing notes, also remove from notes page
    if (type === 'notes') {
        await removeNotesFromNotesPage(courses[courseIndex].id, videos[videoIndex].videoId || videos[videoIndex].id);
    }
    
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} removed`, 'success');
}

async function removeNotesFromNotesPage(courseId, videoId) {
    console.log('Removing notes from notes page:', { courseId, videoId });
    
    const courses = await db.getCourses();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    
    if (courseIndex === -1) return;
    
    const course = courses[courseIndex];
    if (!course.notes) return;
    
    // Find and remove notes associated with this video
    const updatedNotes = course.notes.filter(note => {
        // Assuming note description contains video title or we have another way to identify
        return !note.description.includes(videoId);
    });
    
    courses[courseIndex].notes = updatedNotes;
    await db.saveCourses(courses);
    
    // Trigger notes page update if available
    if (window.CodeNirvahana && window.CodeNirvahana.notes && window.CodeNirvahana.notes.loadNotes) {
        await window.CodeNirvahana.notes.loadNotes();
    }
}

async function handleVideoEdit() {
    console.log('Handling video edit...');
    
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    // Get form values
    const videoIndex = parseInt(document.getElementById('editVideoIndex').value);
    const videoId = document.getElementById('editVideoId').value;
    const videoTitle = document.getElementById('editVideoTitle').value.trim();
    const videoDescription = document.getElementById('editVideoDescription').value.trim();
    const youtubeUrl = document.getElementById('editYoutubeUrl').value.trim();
    
    // Validate required fields
    if (!videoTitle || !videoDescription || !youtubeUrl) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate YouTube URL
    const youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) {
        showToast('Please enter a valid YouTube URL or video ID', 'error');
        return;
    }
    
    // Get current course
    const activeCourseId = localStorage.getItem('activeCourseId');
    if (!activeCourseId) {
        showToast('No active course found', 'error');
        return;
    }
    
    const courses = await db.getCourses();
    const courseIndex = parseInt(activeCourseId);
    
    if (isNaN(courseIndex) || courseIndex < 0 || courseIndex >= courses.length) {
        showToast('Course not found', 'error');
        return;
    }
    
    const course = courses[courseIndex];
    const videos = course.videos || [];
    
    if (videoIndex < 0 || videoIndex >= videos.length) {
        showToast('Video not found', 'error');
        return;
    }
    
    // Update video data
    const video = videos[videoIndex];
    video.title = videoTitle;
    video.description = videoDescription;
    video.youtubeUrl = youtubeUrl;
    video.updatedAt = new Date().toISOString();
    
    // Process new file uploads
    const processFileUpload = (fileInputId, type) => {
        const fileInput = document.getElementById(fileInputId);
        if (!fileInput || !fileInput.files || !fileInput.files[0]) {
            return Promise.resolve(null);
        }
        
        const file = fileInput.files[0];
        
        // Validate file types
        if (type === 'notes' || type === 'assignment') {
            if (file.type !== 'application/pdf') {
                showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} must be a PDF file`, 'error');
                throw new Error('Invalid file type');
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast(`${type} file must be less than 10MB`, 'error');
                throw new Error('File too large');
            }
        }
        
        if (type === 'code') {
            const allowedExtensions = ['.zip', '.txt', '.js', '.py', '.java', '.cpp', '.html', '.css'];
            const fileName = file.name.toLowerCase();
            const isValid = allowedExtensions.some(ext => fileName.endsWith(ext));
            
            if (!isValid) {
                showToast('Code file must be ZIP, TXT, JS, PY, JAVA, CPP, HTML, or CSS', 'error');
                throw new Error('Invalid file type');
            }
            if (file.size > 20 * 1024 * 1024) {
                showToast('Code file must be less than 20MB', 'error');
                throw new Error('File too large');
            }
        }
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve({
                    name: file.name,
                    data: e.target.result,
                    size: file.size,
                    type: file.type
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };
    
    try {
        // Process all file uploads
        const results = await Promise.all([
            processFileUpload('editNotesFile', 'notes'),
            processFileUpload('editAssignmentFile', 'assignment'),
            processFileUpload('editCodeFile', 'code')
        ]);
        
        // Update files if new ones were uploaded
        if (results[0]) {
            video.notes = {
                name: results[0].name,
                data: results[0].data,
                size: results[0].size,
                uploadedAt: new Date().toISOString()
            };
            
            // Sync with notes page
            await syncNotesWithNotesPage(course, video, results[0]);
        }
        
        if (results[1]) {
            video.assignment = {
                name: results[1].name,
                data: results[1].data,
                size: results[1].size,
                uploadedAt: new Date().toISOString()
            };
        }
        
        if (results[2]) {
            video.code = {
                name: results[2].name,
                data: results[2].data,
                size: results[2].size,
                uploadedAt: new Date().toISOString()
            };
        }
        
        // Save changes
        course.updatedAt = new Date().toISOString();
        await db.saveCourses(courses);
        
        // Hide edit form
        document.getElementById('editVideoSection').style.display = 'none';
        
        // Reset form
        resetEditFormFields();
        
        // Show success message
        showToast('Video updated successfully', 'success');
        
        // Reload course data
        await loadCourseData();
        
        // Reload current video if it was the one edited
        if (window.currentVideoIndex === videoIndex) {
            loadVideo(video, course, videoIndex);
        }
    } catch (error) {
        console.error('Error updating files:', error);
        showToast('Error updating files: ' + error.message, 'error');
    }
}

function resetEditFormFields() {
    console.log('Resetting edit form fields');
    
    // Reset form inputs
    document.getElementById('editVideoIndex').value = '';
    document.getElementById('editVideoId').value = '';
    document.getElementById('editVideoTitle').value = '';
    document.getElementById('editVideoDescription').value = '';
    document.getElementById('editYoutubeUrl').value = '';
    
    // Reset file inputs
    document.getElementById('editNotesFile').value = '';
    document.getElementById('editAssignmentFile').value = '';
    document.getElementById('editCodeFile').value = '';
    
    // Clear previews
    ['currentNotesPreview', 'currentAssignmentPreview', 'currentCodePreview',
     'editNotesPreview', 'editAssignmentPreview', 'editCodePreview'].forEach(previewId => {
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.innerHTML = '';
            preview.style.display = 'none';
        }
    });
    
    // Clear actions
    ['currentNotesInfo', 'currentAssignmentInfo', 'currentCodeInfo'].forEach(infoId => {
        const info = document.getElementById(infoId);
        if (info) {
            const actionsDiv = info.querySelector('.file-actions');
            if (actionsDiv) {
                actionsDiv.innerHTML = '';
            }
        }
    });
    
    // Hide delete button
    document.getElementById('deleteVideoBtn').style.display = 'none';
}

async function openDeleteVideoModal(videoIndex) {
    console.log('Opening delete modal for video index:', videoIndex);
    
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    // Get video info
    const activeCourseId = localStorage.getItem('activeCourseId');
    if (!activeCourseId) return;
    
    const courses = await db.getCourses();
    const courseIndex = parseInt(activeCourseId);
    
    if (isNaN(courseIndex) || courseIndex < 0 || courseIndex >= courses.length) return;
    
    const course = courses[courseIndex];
    const videos = course.videos || [];
    
    if (videoIndex < 0 || videoIndex >= videos.length) return;
    
    const video = videos[videoIndex];
    
    // Update modal content
    const deleteVideoInfo = document.getElementById('deleteVideoInfo');
    deleteVideoInfo.innerHTML = `
        <h5>${escapeHtml(video.title)}</h5>
        <p>${escapeHtml(video.description || 'No description')}</p>
        <p><strong>Video ID:</strong> ${video.videoId || video.id}</p>
    `;
    
    // Set up confirm delete button
    const confirmDeleteBtn = document.getElementById('confirmDeleteVideoBtn');
    confirmDeleteBtn.onclick = async function() {
        await deleteVideo(videoIndex);
        document.getElementById('deleteConfirmModal').classList.remove('active');
    };
    
    // Show modal
    document.getElementById('deleteConfirmModal').classList.add('active');
}

async function deleteVideo(videoIndex) {
    console.log('Deleting video at index:', videoIndex);
    
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    // Get current course
    const activeCourseId = localStorage.getItem('activeCourseId');
    if (!activeCourseId) {
        showToast('No active course found', 'error');
        return;
    }
    
    const courses = await db.getCourses();
    const courseIndex = parseInt(activeCourseId);
    
    if (isNaN(courseIndex) || courseIndex < 0 || courseIndex >= courses.length) {
        showToast('Course not found', 'error');
        return;
    }
    
    const course = courses[courseIndex];
    const videos = course.videos || [];
    
    if (videoIndex < 0 || videoIndex >= videos.length) {
        showToast('Video not found', 'error');
        return;
    }
    
    const video = videos[videoIndex];
    
    // Remove notes from notes page if exists
    if (video.notes) {
        await removeNotesFromNotesPage(course.id, video.videoId || video.id);
    }
    
    // Remove video from array
    videos.splice(videoIndex, 1);
    
    // Update course
    course.videos = videos;
    course.updatedAt = new Date().toISOString();
    
    // Save to Supabase
    await db.saveCourses(courses);
    
    // Hide edit form if open
    document.getElementById('editVideoSection').style.display = 'none';
    
    // Show success message
    showToast('Video deleted successfully', 'success');
    
    // Reload course data
    await loadCourseData();
    
    // Clear current video if it was deleted
    if (window.currentVideoIndex === videoIndex) {
        window.currentVideo = null;
        window.currentVideoIndex = null;
        
        // Show empty video state
        const videoEmptyState = document.getElementById('videoEmptyState');
        const youtubePlayer = document.getElementById('youtubePlayer');
        const resourcesGrid = document.querySelector('.resources-grid');
        const resourcesEmptyState = document.querySelector('.resources-empty-state');
        
        if (videoEmptyState) {
            videoEmptyState.style.display = 'flex';
            videoEmptyState.innerHTML = `
                <i class="fas fa-video-slash"></i>
                <h3>No Video Selected</h3>
                <p>Select a video from the playlist to start learning</p>
            `;
        }
        
        if (youtubePlayer) {
            youtubePlayer.style.display = 'none';
            youtubePlayer.src = '';
        }
        
        if (resourcesGrid) resourcesGrid.style.display = 'none';
        if (resourcesEmptyState) resourcesEmptyState.style.display = 'flex';
    }
}

async function handleVideoUpload() {
    console.log('Handling video upload...');
    
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    // Get form values
    const videoTitle = document.getElementById('videoTitle').value.trim();
    const videoDescription = document.getElementById('videoDescription').value.trim();
    const youtubeUrl = document.getElementById('youtubeUrl').value.trim();
    
    // Validate required fields
    if (!videoTitle || !videoDescription || !youtubeUrl) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate YouTube URL
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
        showToast('Please enter a valid YouTube URL or video ID', 'error');
        return;
    }
    
    // Get current course
    const activeCourseId = localStorage.getItem('activeCourseId');
    if (!activeCourseId) {
        showToast('No active course found', 'error');
        return;
    }
    
    const courses = await db.getCourses();
    const courseIndex = parseInt(activeCourseId);
    
    if (isNaN(courseIndex) || courseIndex < 0 || courseIndex >= courses.length) {
        showToast('Course not found', 'error');
        return;
    }
    
    const course = courses[courseIndex];
    
    // Generate video ID
    const videoIdNum = Date.now().toString();
    
    // Create video object
    const newVideo = {
        videoId: videoIdNum,
        title: videoTitle,
        description: videoDescription,
        youtubeUrl: youtubeUrl,
        uploadedAt: new Date().toISOString()
    };
    
    // Process file uploads
    const processFile = (fileInputId, type) => {
        const fileInput = document.getElementById(fileInputId);
        if (!fileInput || !fileInput.files || !fileInput.files[0]) {
            return Promise.resolve(null);
        }
        
        const file = fileInput.files[0];
        
        // Validate file types
        if (type === 'notes' || type === 'assignment') {
            if (file.type !== 'application/pdf') {
                showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} must be a PDF file`, 'error');
                throw new Error('Invalid file type');
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast(`${type} file must be less than 10MB`, 'error');
                throw new Error('File too large');
            }
        }
        
        if (type === 'code') {
            const allowedExtensions = ['.zip', '.txt', '.js', '.py', '.java', '.cpp', '.html', '.css'];
            const fileName = file.name.toLowerCase();
            const isValid = allowedExtensions.some(ext => fileName.endsWith(ext));
            
            if (!isValid) {
                showToast('Code file must be ZIP, TXT, JS, PY, JAVA, CPP, HTML, or CSS', 'error');
                throw new Error('Invalid file type');
            }
            if (file.size > 20 * 1024 * 1024) {
                showToast('Code file must be less than 20MB', 'error');
                throw new Error('File too large');
            }
        }
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve({
                    name: file.name,
                    data: e.target.result,
                    size: file.size,
                    type: file.type
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };
    
    try {
        // Process all files
        const results = await Promise.all([
            processFile('notesFile', 'notes'),
            processFile('assignmentFile', 'assignment'),
            processFile('codeFile', 'code')
        ]);
        
        // Add files to video object
        if (results[0]) {
            newVideo.notes = {
                name: results[0].name,
                data: results[0].data,
                size: results[0].size,
                uploadedAt: new Date().toISOString()
            };
            
            // Sync with notes page
            await syncNotesWithNotesPage(course, newVideo, results[0]);
        }
        
        if (results[1]) {
            newVideo.assignment = {
                name: results[1].name,
                data: results[1].data,
                size: results[1].size,
                uploadedAt: new Date().toISOString()
            };
        }
        
        if (results[2]) {
            newVideo.code = {
                name: results[2].name,
                data: results[2].data,
                size: results[2].size,
                uploadedAt: new Date().toISOString()
            };
        }
        
        // Add video to course
        if (!course.videos) {
            course.videos = [];
        }
        
        course.videos.push(newVideo);
        course.updatedAt = new Date().toISOString();
        
        // Save to Supabase
        await db.saveCourses(courses);
        
        // Reset form
        resetUploadFormFields();
        
        // Hide form
        document.getElementById('adminUploadSection').style.display = 'none';
        
        // Show success message
        showToast('Video added successfully', 'success');
        
        // Reload course data
        await loadCourseData();
    } catch (error) {
        console.error('Error uploading files:', error);
        showToast('Error uploading files: ' + error.message, 'error');
    }
}

function resetUploadFormFields() {
    console.log('Resetting upload form fields');
    
    // Reset form inputs
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoDescription').value = '';
    document.getElementById('youtubeUrl').value = '';
    
    // Reset file inputs
    document.getElementById('notesFile').value = '';
    document.getElementById('assignmentFile').value = '';
    document.getElementById('codeFile').value = '';
    
    // Clear previews
    document.getElementById('notesPreview').innerHTML = '';
    document.getElementById('notesPreview').style.display = 'none';
    document.getElementById('assignmentPreview').innerHTML = '';
    document.getElementById('assignmentPreview').style.display = 'none';
    document.getElementById('codePreview').innerHTML = '';
    document.getElementById('codePreview').style.display = 'none';
}

async function syncNotesWithNotesPage(course, video, notesData) {
    console.log('Syncing notes with notes page...');
    
    // Get all courses
    const courses = await db.getCourses();
    const courseIndex = courses.findIndex(c => c.id === course.id);
    
    if (courseIndex === -1) {
        console.error('Course not found for notes sync');
        return;
    }
    
    // Ensure notes array exists
    if (!courses[courseIndex].notes) {
        courses[courseIndex].notes = [];
    }
    
    // Create note object matching notes.js structure
    const newNote = {
        id: Date.now().toString(),
        name: notesData.name,
        description: video.description || 'Notes for ' + video.title,
        data: notesData.data,
        size: notesData.size,
        uploadedAt: new Date().toISOString()
    };
    
    // Add to course notes
    courses[courseIndex].notes.push(newNote);
    
    // Update course timestamp
    courses[courseIndex].updatedAt = new Date().toISOString();
    
    // Save back to Supabase
    await db.saveCourses(courses);
    
    console.log('Notes synced with notes page');
    
    // Trigger notes page update if available
    if (window.CodeNirvahana && window.CodeNirvahana.notes && window.CodeNirvahana.notes.loadNotes) {
        await window.CodeNirvahana.notes.loadNotes();
    }
}

async function checkAdminStatus() {
    console.log('Checking admin status...');
    
    const authUser = await db.getAuth();
    const isAdmin = authUser && authUser.isLoggedIn && authUser.role === 'admin';
    
    const addVideoBtn = document.getElementById('addVideoBtn');
    const adminUploadSection = document.getElementById('adminUploadSection');
    const toggleUploadForm = document.getElementById('toggleUploadForm');
    
    console.log('Is admin?', isAdmin);
    
    // Store admin status globally
    window.currentUserIsAdmin = isAdmin;
    
    if (isAdmin) {
        // Show admin controls
        if (addVideoBtn) {
            addVideoBtn.style.display = 'flex';
            addVideoBtn.addEventListener('click', function() {
                adminUploadSection.style.display = 'block';
                document.getElementById('editVideoSection').style.display = 'none';
            });
        }
        
        if (toggleUploadForm) {
            toggleUploadForm.addEventListener('click', function() {
                adminUploadSection.style.display = 'none';
                resetUploadFormFields();
            });
        }
    } else {
        // Hide admin controls
        if (addVideoBtn) addVideoBtn.style.display = 'none';
        if (adminUploadSection) adminUploadSection.style.display = 'none';
        if (document.getElementById('editVideoSection')) {
            document.getElementById('editVideoSection').style.display = 'none';
        }
    }
    
    return isAdmin;
}

function initEventListeners() {
    // Handle window resize for responsive layout
    window.addEventListener('resize', function() {
        // Adjust layout if needed
    });
    
    // Handle page visibility change
    document.addEventListener('visibilitychange', async function() {
        if (!document.hidden) {
            // Page became visible again, refresh data
            await loadCourseData();
        }
    });
}

function viewResource(type) {
    console.log('Viewing resource:', type);
    
    if (!window.currentVideo || !window.currentVideo[type]) {
        showToast('Resource not available', 'error');
        return;
    }
    
    const resource = window.currentVideo[type];
    
    // Convert data URL to blob
    const byteString = atob(resource.data.split(',')[1]);
    const mimeString = resource.data.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    const url = URL.createObjectURL(blob);
    
    // Open in new window for PDFs
    if (type === 'notes' || type === 'assignment') {
        window.open(url, '_blank');
    } else {
        // Download for other file types
        const link = document.createElement('a');
        link.href = url;
        link.download = resource.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadResource(type) {
    console.log('Downloading resource:', type);
    
    if (!window.currentVideo || !window.currentVideo[type]) {
        showToast('Resource not available', 'error');
        return;
    }
    
    const resource = window.currentVideo[type];
    
    // Convert data URL to blob
    const byteString = atob(resource.data.split(',')[1]);
    const mimeString = resource.data.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = resource.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showToast(message, type = 'info') {
    console.log('Showing toast:', { message, type });
    
    const toast = document.getElementById('messageToast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon');
    
    if (!toast || !toastMessage) {
        console.error('Toast elements not found');
        return;
    }
    
    // Set message
    toastMessage.textContent = message;
    
    // Set icon based on type
    toastIcon.className = 'toast-icon';
    if (type === 'success') {
        toastIcon.classList.add('fas', 'fa-check-circle');
        toastIcon.style.color = '#22c55e';
    } else if (type === 'error') {
        toastIcon.classList.add('fas', 'fa-exclamation-circle');
        toastIcon.style.color = '#ef4444';
    } else {
        toastIcon.classList.add('fas', 'fa-info-circle');
        toastIcon.style.color = '#38bdf8';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export for global use
window.CodeNirvahana = window.CodeNirvahana || {};
window.CodeNirvahana.courseDetail = {
    loadCourseData: loadCourseData,
    checkAdminStatus: checkAdminStatus,
    showToast: showToast
};

console.log('Course detail module loaded');