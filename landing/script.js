// Landing page script

// Debug logging for hero image - added immediately to catch load/error events
const heroImage = document.querySelector('.hero-image img');
if (heroImage) {
  console.log('Hero image element found, src:', heroImage.src);
  heroImage.addEventListener('load', () => {
    console.log('Hero image loaded successfully');
  });
  heroImage.addEventListener('error', (e) => {
    console.error('Hero image failed to load:', e);
    console.error('Image src:', heroImage.src);
  });
  // Check if already loaded
  if (heroImage.complete) {
    if (heroImage.naturalHeight === 0) {
      console.error('Hero image failed to load (naturalHeight is 0)');
    } else {
      console.log('Hero image already loaded');
    }
  }
} else {
  console.error('Hero image element not found');
}

document.addEventListener('DOMContentLoaded', () => {
  // Install button functionality
  const installButtons = document.querySelectorAll('#install-button, #install-button-bottom');
  
  installButtons.forEach(button => {
    button.addEventListener('click', () => {
      // In a real extension, this would redirect to the Chrome Web Store
      // For demo purposes, we'll just show an alert
      alert('This would redirect to the Chrome Web Store in a real extension.');
      
      // Alternatively, if the extension is already published, use:
      // window.open('https://chrome.google.com/webstore/detail/your-extension-id', '_blank');
    });
  });
  
  // Smooth scrolling for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Video placeholder click handler
  const videoPlaceholder = document.querySelector('.video-placeholder');
  if (videoPlaceholder) {
    videoPlaceholder.addEventListener('click', () => {
      // In a real site, this would embed a YouTube video or open a modal
      alert('This would play a demo video in a real website.');
    });
  }
  
  // Add scroll animation for elements
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe elements that should animate on scroll
  document.querySelectorAll('.feature-card, .step, .faq-item').forEach(el => {
    observer.observe(el);
  });

  // Debug logging for hero image
  const heroImage = document.querySelector('.hero-image img');
  if (heroImage) {
    heroImage.addEventListener('load', () => {
      console.log('Hero image loaded successfully');
    });
    heroImage.addEventListener('error', (e) => {
      console.error('Hero image failed to load:', e);
      console.error('Image src:', heroImage.src);
    });
  } else {
    console.error('Hero image element not found');
  }
});