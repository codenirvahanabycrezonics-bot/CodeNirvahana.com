// Initialize when DOM is loaded - UPDATED WITH SUPABASE
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize all components
    initMobileMenu();
    initScrollAnimations();
    initAuthModal();
    initCurrentYear();
    initNavbarScroll();
    initSmoothScroll();
    
    // Initialize Supabase
    try {
        await db.initialize();
        console.log('Supabase initialized for index page');
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
    }
});

// Mobile menu toggle
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
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!mobileMenuBtn.contains(event.target) && !navLinks.contains(event.target)) {
                navLinks.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}

// Scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);
    
    // Observe all cards and sections
    document.querySelectorAll('.teaching-card, .advantage-card, .method-step').forEach(el => {
        observer.observe(el);
    });
}

// Auth modal
function initAuthModal() {
    const authModal = document.getElementById('authModal');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const cancelAuthModal = document.getElementById('cancelAuthModal');
    
    if (closeAuthModal) {
        closeAuthModal.addEventListener('click', function() {
            authModal.classList.remove('active');
        });
    }
    
    if (cancelAuthModal) {
        cancelAuthModal.addEventListener('click', function() {
            authModal.classList.remove('active');
        });
    }
    
    // Close modal on outside click
    authModal.addEventListener('click', function(event) {
        if (event.target === authModal) {
            authModal.classList.remove('active');
        }
    });
    
    // Global function to show auth modal
    window.showAuthModal = function() {
        authModal.classList.add('active');
    };
}

// Set current year in footer
function initCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Navbar scroll effect
function initNavbarScroll() {
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            navbar.style.backgroundColor = 'rgba(15, 23, 42, 0.98)';
            navbar.style.backdropFilter = 'blur(10px)';
        } else {
            navbar.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
            navbar.style.backdropFilter = 'blur(10px)';
        }
        
        lastScrollTop = scrollTop;
    });
}

// Smooth scroll for anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Only handle internal anchor links
            if (href === '#') return;
            
            const targetElement = document.querySelector(href);
            if (targetElement) {
                e.preventDefault();
                
                // Close mobile menu if open
                const navLinks = document.getElementById('navLinks');
                const mobileMenuBtn = document.getElementById('mobileMenuBtn');
                if (navLinks && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    const icon = mobileMenuBtn.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
                
                // Smooth scroll to target
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Check auth status on page load
async function checkAuthStatus() {
    const authUser = await db.getAuth();
    
    if (!authUser) {
        // Create default guest user in Supabase
        await db.saveAuth({
            isLoggedIn: false,
            role: 'guest'
        });
        return { isLoggedIn: false, role: 'guest' };
    }
    
    return authUser;
}

// Export for use in other files
window.CodeNirvahana = window.CodeNirvahana || {};
window.CodeNirvahana.auth = {
    checkAuthStatus: checkAuthStatus,
    isAdmin: async function() {
        const auth = await checkAuthStatus();
        return auth.isLoggedIn && auth.role === 'admin';
    }
};