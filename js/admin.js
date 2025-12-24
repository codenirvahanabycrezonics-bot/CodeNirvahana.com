// Admin Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize admin page
    initAdminPage();
    initLoginForm();
    initLogoutButton();
    initMobileMenu();
    refreshStats();
    
    // Check auth status and update UI
    updateAuthUI();
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

// Initialize admin page
function initAdminPage() {
    // Set current year in footer if exists
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Initialize login form
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Simple admin authentication (for demo purposes only)
            // In a real application, this would be handled securely on the backend
            if (username === 'vishwakarthikeya' && password === 'Vishwa@2912') {
                // Set admin authentication
                localStorage.setItem('authUser', JSON.stringify({
                    isLoggedIn: true,
                    role: 'admin'
                }));
                
                showToast('Successfully logged in as administrator', 'success');
                updateAuthUI();
                refreshStats();
            } else {
                showToast('Invalid username or password', 'error');
            }
        });
    }
}

// Initialize logout button
function initLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Set guest authentication
            localStorage.setItem('authUser', JSON.stringify({
                isLoggedIn: false,
                role: 'guest'
            }));
            
            showToast('Successfully logged out', 'success');
            updateAuthUI();
            refreshStats();
        });
    }
}

// Update UI based on authentication status
function updateAuthUI() {
    const auth = checkAuthStatus();
    const loginCard = document.getElementById('loginCard');
    const dashboardCard = document.getElementById('dashboardCard');
    
    if (auth.isLoggedIn && auth.role === 'admin') {
        // Show dashboard, hide login
        if (loginCard) loginCard.classList.add('hidden');
        if (dashboardCard) dashboardCard.classList.remove('hidden');
    } else {
        // Show login, hide dashboard
        if (loginCard) loginCard.classList.remove('hidden');
        if (dashboardCard) dashboardCard.classList.add('hidden');
    }
}

// Check auth status
function checkAuthStatus() {
    const authUser = JSON.parse(localStorage.getItem('authUser'));
    
    if (!authUser) {
        return { isLoggedIn: false, role: 'guest' };
    }
    
    return authUser;
}

// Refresh data statistics
function refreshStats() {
    // Count courses
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    document.getElementById('coursesCount').textContent = courses.length;
    
    // Count notes (from all courses)
    let notesCount = 0;
    courses.forEach(course => {
        if (course.notes && course.notes.length > 0) {
            notesCount += course.notes.length;
        }
    });
    document.getElementById('notesCount').textContent = notesCount;
    
    // Calculate storage used (approximate)
    const totalData = JSON.stringify(localStorage).length;
    const storageKB = Math.round(totalData / 1024);
    document.getElementById('storageUsed').textContent = `${storageKB} KB`;
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

// Show coming soon modal
function showComingSoon() {
    const modal = document.getElementById('comingSoonModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Close coming soon modal
function closeComingSoonModal() {
    const modal = document.getElementById('comingSoonModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Clear all data (with confirmation)
function clearAllData() {
    if (confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
        localStorage.clear();
        
        // Reset auth to guest
        localStorage.setItem('authUser', JSON.stringify({
            isLoggedIn: false,
            role: 'guest'
        }));
        
        showToast('All data has been cleared', 'success');
        updateAuthUI();
        refreshStats();
        
        // Also refresh other pages if they're open
        if (typeof window.CodeNirvahana !== 'undefined') {
            if (typeof window.CodeNirvahana.courses !== 'undefined' && 
                typeof window.CodeNirvahana.courses.loadCourses === 'function') {
                window.CodeNirvahana.courses.loadCourses();
            }
        }
    }
}

// Clear courses data only
function clearCoursesData() {
    if (confirm('Are you sure you want to clear all courses? This action cannot be undone.')) {
        localStorage.removeItem('courses');
        showToast('All courses have been cleared', 'success');
        refreshStats();
        
        // Refresh courses page if open
        if (typeof window.CodeNirvahana !== 'undefined') {
            if (typeof window.CodeNirvahana.courses !== 'undefined' && 
                typeof window.CodeNirvahana.courses.loadCourses === 'function') {
                window.CodeNirvahana.courses.loadCourses();
            }
        }
    }
}

// Clear notes data only
function clearNotesData() {
    if (confirm('Are you sure you want to clear all notes? This action cannot be undone.')) {
        const courses = JSON.parse(localStorage.getItem('courses')) || [];
        
        // Remove notes from all courses
        courses.forEach(course => {
            delete course.notes;
        });
        
        localStorage.setItem('courses', JSON.stringify(courses));
        showToast('All notes have been cleared', 'success');
        refreshStats();
        
        // Refresh notes page if open
        if (typeof window.CodeNirvahana !== 'undefined') {
            if (typeof window.CodeNirvahana.notes !== 'undefined' && 
                typeof window.CodeNirvahana.notes.loadNotes === 'function') {
                window.CodeNirvahana.notes.loadNotes();
            }
        }
    }
}

// Export all data as JSON
function exportAllData() {
    const allData = {};
    
    // Get all localStorage data
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
            allData[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
            allData[key] = localStorage.getItem(key);
        }
    }
    
    // Create download
    const dataStr = JSON.stringify(allData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `codenirvahana-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast('Data exported successfully', 'success');
}

// Initialize modal close handlers
document.addEventListener('DOMContentLoaded', function() {
    const comingSoonModal = document.getElementById('comingSoonModal');
    
    if (comingSoonModal) {
        // Close modal on outside click
        comingSoonModal.addEventListener('click', function(event) {
            if (event.target === comingSoonModal) {
                closeComingSoonModal();
            }
        });
        
        // Close modal on escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && comingSoonModal.classList.contains('active')) {
                closeComingSoonModal();
            }
        });
    }
});

// Export functions for global use
window.CodeNirvahana = window.CodeNirvahana || {};
window.CodeNirvahana.admin = {
    showToast: showToast,
    refreshStats: refreshStats,
    checkAuthStatus: checkAuthStatus
};