document.addEventListener('DOMContentLoaded', async () => {
    highlightCurrentPage();
    initializeMobileMenu();
    initializeModals();
    initializeEventForm();
    
    // Check if we are on the home page with the dynamic slider
    if (document.getElementById('dynamic-slider')) {
        await fetchEventsForSlider(); // Fetch events first
    } else {
        initializeSlider(); // Run normally on other pages
    }
});

function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        if (currentPath.endsWith(link.getAttribute('href')) || (currentPath.endsWith('/') && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
        }
    });
}

// --- Dynamic Fetch Logic for Home Page Slider ---
async function fetchEventsForSlider() {
    const sliderContainer = document.getElementById('dynamic-slider');
    const controlsContainer = sliderContainer.querySelector('.slider-controls');
    
    try {
        // 1. Fetch the events.html page
        const response = await fetch('events.html');
        if (!response.ok) throw new Error('Network response was not ok');
        const htmlText = await response.text();

        // 2. Parse the HTML to extract event cards
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const eventCards = doc.querySelectorAll('.event-card');

        // 3. Clear existing slides (keep controls)
        sliderContainer.innerHTML = '';
        
        // Let's show the first 5 events in the slider (change 5 to whatever you want)
        const recentEvents = Array.from(eventCards).slice(0, 5);

        // 4. Build new slides based on the fetched events
        recentEvents.forEach((card, index) => {
            const title = card.querySelector('.hidden-title').innerText;
            const imgSrc = card.querySelector('.card-img-top').getAttribute('src');
            
            // Grab the first paragraph of the description and trim it so it fits nicely
            let rawDesc = card.querySelector('.hidden-desc p:nth-of-type(2)')?.innerText || "Join us for this exciting JIDO event.";
            let shortDesc = rawDesc.length > 100 ? rawDesc.substring(0, 100) + '...' : rawDesc;

            const slide = document.createElement('div');
            slide.className = `slide ${index === 0 ? 'active' : ''}`;
            slide.innerHTML = `
                <img src="${imgSrc}" alt="${title}" class="slide-image">
                <div class="slide-overlay"></div>
                <div class="slide-content">
                    <h3>${title}</h3>
                    <p>${shortDesc}</p>
                </div>
            `;
            sliderContainer.appendChild(slide);
        });

        // 5. Re-add controls and start the slider mechanics
        sliderContainer.appendChild(controlsContainer);
        initializeSlider();

    } catch (error) {
        console.error('Error fetching events:', error);
        sliderContainer.innerHTML = '<div style="color:white; text-align:center; padding: 100px 20px;"><h3>Unable to load events.</h3><p>Make sure you are running a local server (like VS Code Live Server).</p></div>';
    }
}

// --- Mobile Menu Logic ---
function initializeMobileMenu() {
    const toggle = document.getElementById('mobile-menu');
    const nav = document.querySelector('.nav-links');
    
    if (toggle && nav) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggle.classList.toggle('active');
            nav.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        });
        
        document.addEventListener('click', (e) => {
            if (nav.classList.contains('active') && !nav.contains(e.target) && !toggle.contains(e.target)) {
                toggle.classList.remove('active');
                nav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

// --- Slider Logic ---
function initializeSlider() {
    const slides = document.querySelectorAll('.slide');
    const dotsContainer = document.querySelector('.slider-controls');
    const sliderContainer = document.querySelector('.slider-container');
    
    if (slides.length === 0) return;
    
    // Clear existing dots just in case it re-initializes
    dotsContainer.innerHTML = '';
    
    let currentSlideIndex = 0;
    let sliderInterval;
    
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('slider-dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });
    
    const dots = document.querySelectorAll('.slider-dot');
    
    function showSlide(index) {
        slides[currentSlideIndex].classList.remove('active');
        dots[currentSlideIndex].classList.remove('active');
        currentSlideIndex = index;
        slides[currentSlideIndex].classList.add('active');
        dots[currentSlideIndex].classList.add('active');
    }
    
    function nextSlide() { showSlide((currentSlideIndex + 1) % slides.length); }
    function prevSlide() { showSlide((currentSlideIndex - 1 + slides.length) % slides.length); }
    
    function goToSlide(index) {
        showSlide(index);
        resetAutoSlide();
    }
    
    function startAutoSlide() { sliderInterval = setInterval(nextSlide, 5000); }
    function resetAutoSlide() { clearInterval(sliderInterval); startAutoSlide(); }
    
    startAutoSlide();

    let touchStartX = 0;
    let touchEndX = 0;

    if (sliderContainer) {
        sliderContainer.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
            clearInterval(sliderInterval); 
        }, { passive: true });

        sliderContainer.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
            startAutoSlide(); 
        }, { passive: true });
    }

    function handleSwipe() {
        const swipeThreshold = 50; 
        if (touchStartX - touchEndX > swipeThreshold) nextSlide(); 
        if (touchEndX - touchStartX > swipeThreshold) prevSlide(); 
    }
}

// --- Modal & Gallery Logic ---
function initializeModals() {
    const overlay = document.getElementById('eventOverlay');
    const title = document.getElementById('modalTitle');
    const desc = document.getElementById('modalDesc');
    
    let lightbox = document.getElementById('lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = '<span class="lightbox-close">&times;</span><img id="lightbox-img" src="" alt="Full view">';
        document.body.appendChild(lightbox);
    }
    const lightboxImg = document.getElementById('lightbox-img');

    document.querySelectorAll('.event-card').forEach(card => {
        card.addEventListener('click', () => {
            title.innerText = card.querySelector('.hidden-title').innerText;
            const imagesAttr = card.getAttribute('data-images');
            
            let galleryHTML = '';
            if (imagesAttr && imagesAttr.trim() !== "") {
                galleryHTML = '<div class="modal-gallery">';
                imagesAttr.split(',').forEach(src => {
                    if (src.trim()) {
                        galleryHTML += `<img src="${src.trim()}" alt="Event" loading="lazy">`;
                    }
                });
                galleryHTML += '</div>';
            }

            desc.innerHTML = galleryHTML + card.querySelector('.hidden-desc').innerHTML;
            
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden'; 
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.matches('.modal-gallery img')) {
            lightboxImg.src = e.target.src;
            lightbox.classList.add('open');
        }
    });

    const modalClose = document.querySelector('.modal-close');
    if(modalClose) {
        modalClose.addEventListener('click', () => {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        });
    }

    lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
        lightbox.classList.remove('open');
    });

    if(overlay) {
        overlay.addEventListener('click', (e) => { 
            if (e.target === overlay) { 
                overlay.classList.remove('open'); 
                document.body.style.overflow = ''; 
            }
        });
    }
}

// --- Form Logic ---
function initializeEventForm() {
    const formBox = document.getElementById('eventFormBox');
    const applyBtn = document.getElementById('applyEventBtn');
    const form = document.getElementById('modernEventForm');
    const responseBox = document.getElementById('responseMessage');
    
    if (applyBtn && formBox) {
        applyBtn.addEventListener('click', () => {
            formBox.classList.add('active');
            if(responseBox) responseBox.style.display = 'none';
            form.reset();
            applyBtn.style.display = 'none';
        });
    }
    
    if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing...";
            
            const formData = new FormData(form);
            const dataPayload = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('http://localhost:5000/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataPayload)
                });
                const result = await response.json();
                
                if(responseBox) {
                    responseBox.style.display = 'block';
                    responseBox.className = result.status === "success" ? 'success' : 'error';
                    responseBox.innerText = result.message;
                }
                if (result.status === "success") form.reset();
            } catch (error) {
                if(responseBox) {
                    responseBox.style.display = 'block';
                    responseBox.className = 'error';
                    responseBox.innerText = "Cannot connect to server.";
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Confirm Registration";
            }
        });
    }
}