// Courses Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize courses page
    initCoursesPage();
    initMobileMenu();
    loadCourses();
    initAddCourseModal();
    initEditCourseModal();
    initDeleteModal();
    
    // Check admin status and update UI
    updateAdminUI();
});

// Initialize mobile menu
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

// Initialize courses page
function initCoursesPage() {
    // Set up event listeners
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Close modal on outside click
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            modals.forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

// Load courses from localStorage
function loadCourses() {
    const coursesGrid = document.getElementById('coursesGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!coursesGrid || !emptyState) return;
    
    // Clear current courses (except empty state)
    coursesGrid.innerHTML = '';
    
    // Get courses from localStorage
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    
    if (courses.length === 0) {
        // Show empty state
        emptyState.style.display = 'block';
        coursesGrid.appendChild(emptyState);
    } else {
        // Hide empty state
        emptyState.style.display = 'none';
        
        // Add each course to the grid
        courses.forEach((course, index) => {
            const courseCard = createCourseCard(course, index);
            coursesGrid.appendChild(courseCard);
        });
    }
}

// Create a course card element
function createCourseCard(course, index) {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.dataset.courseId = course.id || index;
    
    // Format date
    const courseDate = course.createdAt ? new Date(course.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) : 'Recently added';
    
    // Count videos
    const videosCount = course.videos ? course.videos.length : 0;
    
    // Check if user is admin
    const isAdmin = checkAdminStatus();
    
    card.innerHTML = `
        <div class="course-card-header">
            ${isAdmin ? `
                <div class="course-card-actions">
                    <button class="action-btn edit-btn" onclick="openEditCourseModal(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="openDeleteModal(${index})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            ` : ''}
            
            <div class="course-card-icon">
                <i class="fas fa-graduation-cap"></i>
            </div>
            
            <h3 class="course-card-title">${escapeHtml(course.title)}</h3>
            <p class="course-card-description">${escapeHtml(course.description)}</p>
        </div>
        
        <div class="course-card-footer">
            <div class="course-meta">
                <div class="course-date">
                    <i class="far fa-calendar"></i>
                    ${courseDate}
                </div>
                <div class="course-stats">
                    <div class="course-stat">
                        <i class="fas fa-video"></i>
                        <span>${videosCount} Video${videosCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>
            
            <button class="btn btn-primary course-card-cta" onclick="viewCourseDetails(${index})">
                <i class="fas fa-play-circle"></i>
                View Course Details
            </button>
        </div>
    `;
    
    return card;
}

// View course details
function viewCourseDetails(courseIndex) {
    // Save active course ID to localStorage
    localStorage.setItem('activeCourseId', courseIndex.toString());
    
    // Redirect to course details page
    window.location.href = `course-details.html`;
}

// Check if user is admin
function checkAdminStatus() {
    const authUser = JSON.parse(localStorage.getItem('authUser'));
    if (!authUser) {
        return false;
    }
    return authUser.isLoggedIn && authUser.role === 'admin';
}

// Update UI based on admin status
function updateAdminUI() {
    const isAdmin = checkAdminStatus();
    const adminActionsContainer = document.getElementById('adminActionsContainer');
    
    if (!adminActionsContainer) return;
    
    if (isAdmin) {
        adminActionsContainer.innerHTML = `
            <button class="btn btn-primary" id="addCourseBtn">
                <i class="fas fa-plus-circle"></i>
                Add New Course
            </button>
        `;
        
        // Add event listener to the button
        const addCourseBtn = document.getElementById('addCourseBtn');
        if (addCourseBtn) {
            addCourseBtn.addEventListener('click', function() {
                document.getElementById('addCourseModal').classList.add('active');
            });
        }
    } else {
        adminActionsContainer.innerHTML = '';
    }
}

// Initialize add course modal
function initAddCourseModal() {
    const addCourseModal = document.getElementById('addCourseModal');
    const closeAddCourseModal = document.getElementById('closeAddCourseModal');
    const cancelAddCourseModal = document.getElementById('cancelAddCourseModal');
    const addCourseForm = document.getElementById('addCourseForm');
    
    if (closeAddCourseModal) {
        closeAddCourseModal.addEventListener('click', function() {
            addCourseModal.classList.remove('active');
        });
    }
    
    if (cancelAddCourseModal) {
        cancelAddCourseModal.addEventListener('click', function() {
            addCourseModal.classList.remove('active');
        });
    }
    
    if (addCourseForm) {
        addCourseForm.addEventListener('submit', function(event) {
            event.preventDefault();
            saveNewCourse();
        });
    }
}

// Initialize edit course modal
function initEditCourseModal() {
    const editCourseModal = document.getElementById('editCourseModal');
    const closeEditCourseModal = document.getElementById('closeEditCourseModal');
    const cancelEditCourseModal = document.getElementById('cancelEditCourseModal');
    const editCourseForm = document.getElementById('editCourseForm');
    
    if (closeEditCourseModal) {
        closeEditCourseModal.addEventListener('click', function() {
            editCourseModal.classList.remove('active');
        });
    }
    
    if (cancelEditCourseModal) {
        cancelEditCourseModal.addEventListener('click', function() {
            editCourseModal.classList.remove('active');
        });
    }
    
    if (editCourseForm) {
        editCourseForm.addEventListener('submit', function(event) {
            event.preventDefault();
            saveEditedCourse();
        });
    }
}

// Initialize delete confirmation modal
function initDeleteModal() {
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const closeDeleteConfirmModal = document.getElementById('closeDeleteConfirmModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    
    if (closeDeleteConfirmModal) {
        closeDeleteConfirmModal.addEventListener('click', function() {
            deleteConfirmModal.classList.remove('active');
        });
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function() {
            deleteConfirmModal.classList.remove('active');
        });
    }
    
    // Confirm delete button is handled in openDeleteModal
}

// Open edit course modal
function openEditCourseModal(courseIndex) {
    if (!checkAdminStatus()) {
        showAuthModal();
        return;
    }
    
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    const course = courses[courseIndex];
    
    if (!course) return;
    
    // Set form values
    document.getElementById('editCourseId').value = courseIndex;
    document.getElementById('editCourseTitle').value = course.title;
    document.getElementById('editCourseDescription').value = course.description;
    
    // Show current thumbnail if exists
    const thumbnailPreview = document.getElementById('currentThumbnailPreview');
    if (course.thumbnail) {
        thumbnailPreview.innerHTML = `
            <img src="${course.thumbnail}" alt="Current thumbnail">
        `;
    } else {
        thumbnailPreview.innerHTML = `
            <div style="padding: var(--spacing-md); background: rgba(148, 163, 184, 0.1); border-radius: var(--radius-md); text-align: center; color: var(--text-secondary);">
                <i class="fas fa-image"></i>
                <p>No thumbnail set</p>
            </div>
        `;
    }
    
    // Show modal
    document.getElementById('editCourseModal').classList.add('active');
}

// Open delete confirmation modal
function openDeleteModal(courseIndex) {
    if (!checkAdminStatus()) {
        showAuthModal();
        return;
    }
    
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    const course = courses[courseIndex];
    
    if (!course) return;
    
    // Set course name for confirmation
    document.getElementById('deleteCourseName').textContent = course.title;
    
    // Set up confirm delete button
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    confirmDeleteBtn.onclick = function() {
        deleteCourse(courseIndex);
    };
    
    // Show modal
    document.getElementById('deleteConfirmModal').classList.add('active');
}

// Save new course
function saveNewCourse() {
    if (!checkAdminStatus()) {
        showAuthModal();
        return;
    }
    
    const courseTitle = document.getElementById('courseTitle').value.trim();
    const courseDescription = document.getElementById('courseDescription').value.trim();
    const thumbnailInput = document.getElementById('courseThumbnail');
    
    if (!courseTitle || !courseDescription) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Get existing courses
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    
    // Create new course object
    const newCourse = {
        id: Date.now().toString(),
        title: courseTitle,
        description: courseDescription,
        thumbnail: null,
        videos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Handle thumbnail upload if provided
    if (thumbnailInput.files && thumbnailInput.files[0]) {
        const file = thumbnailInput.files[0];
        if (!file.type.startsWith('image/')) {
            showToast('Please upload a valid image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            newCourse.thumbnail = e.target.result;
            saveCourseToStorage(courses, newCourse);
        };
        reader.readAsDataURL(file);
    } else {
        saveCourseToStorage(courses, newCourse);
    }
}

// Save course to storage
function saveCourseToStorage(courses, newCourse) {
    // Add new course
    courses.push(newCourse);
    
    // Save to localStorage
    localStorage.setItem('courses', JSON.stringify(courses));
    
    // Reset form and close modal
    document.getElementById('addCourseForm').reset();
    document.getElementById('addCourseModal').classList.remove('active');
    
    // Show success message
    showToast('Course created successfully', 'success');
    
    // Reload courses
    loadCourses();
}

// Save edited course
function saveEditedCourse() {
    if (!checkAdminStatus()) {
        showAuthModal();
        return;
    }
    
    const courseIndex = parseInt(document.getElementById('editCourseId').value);
    const courseTitle = document.getElementById('editCourseTitle').value.trim();
    const courseDescription = document.getElementById('editCourseDescription').value.trim();
    const thumbnailInput = document.getElementById('editCourseThumbnail');
    
    if (!courseTitle || !courseDescription) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Get existing courses
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    
    if (courseIndex < 0 || courseIndex >= courses.length) {
        showToast('Course not found', 'error');
        return;
    }
    
    // Update course
    courses[courseIndex].title = courseTitle;
    courses[courseIndex].description = courseDescription;
    courses[courseIndex].updatedAt = new Date().toISOString();
    
    // Handle thumbnail upload if provided
    if (thumbnailInput.files && thumbnailInput.files[0]) {
        const file = thumbnailInput.files[0];
        if (!file.type.startsWith('image/')) {
            showToast('Please upload a valid image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            courses[courseIndex].thumbnail = e.target.result;
            saveEditedCourseToStorage(courses);
        };
        reader.readAsDataURL(file);
    } else {
        saveEditedCourseToStorage(courses);
    }
}

// Save edited course to storage
function saveEditedCourseToStorage(courses) {
    // Save to localStorage
    localStorage.setItem('courses', JSON.stringify(courses));
    
    // Close modal
    document.getElementById('editCourseModal').classList.remove('active');
    
    // Show success message
    showToast('Course updated successfully', 'success');
    
    // Reload courses
    loadCourses();
}

// Delete course
function deleteCourse(courseIndex) {
    if (!checkAdminStatus()) {
        showAuthModal();
        return;
    }
    
    // Get existing courses
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    
    if (courseIndex < 0 || courseIndex >= courses.length) {
        showToast('Course not found', 'error');
        return;
    }
    
    // Remove course
    courses.splice(courseIndex, 1);
    
    // Save to localStorage
    localStorage.setItem('courses', JSON.stringify(courses));
    
    // Close modal
    document.getElementById('deleteConfirmModal').classList.remove('active');
    
    // Show success message
    showToast('Course deleted successfully', 'success');
    
    // Reload courses
    loadCourses();
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
window.CodeNirvahana.courses = {
    loadCourses: loadCourses,
    checkAdminStatus: checkAdminStatus
};