// Simple script to create basic PNG icons using Canvas (run in browser console)

function createIcon(size, color = '#4f46e5') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    
    // Chat bubble icon
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(size * 0.15, size * 0.2, size * 0.7, size * 0.5, size * 0.1);
    ctx.fill();
    
    // Small circle for tail
    ctx.beginPath();
    ctx.arc(size * 0.25, size * 0.8, size * 0.05, 0, 2 * Math.PI);
    ctx.fill();
    
    return canvas.toDataURL('image/png');
}

// Generate icons
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const icons = {};

sizes.forEach(size => {
    icons[`icon-${size}x${size}.png`] = createIcon(size);
});

console.log('Generated icons:', icons);
console.log('Copy the data URLs to create your icon files');