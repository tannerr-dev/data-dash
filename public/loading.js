let width = window.innerWidth;
let height = window.innerHeight;

const svg = d3.select("#graph")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

let time = 0;
let animationId;
let startTime = Date.now();
const ANIMATION_DURATION = 60000; // 1 minute in milliseconds

// Create the path element for the sine wave
const wavePath = svg.append("path")
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-width", 2);

function generateWaveData(timeOffset) {
    return Array.from({length: 500}, (_, i) => {
        const x = i / 25;
        const amplitude = Math.exp(-x / 3);
        return {
            x: x,
            y: amplitude * Math.sin(5 * x - timeOffset)
        };
    });
}

function animateWave() {
    // Check if animation should timeout
    if (Date.now() - startTime >= ANIMATION_DURATION) {
        return; // Stop the animation
    }

    time += 0.038;
    const data = generateWaveData(time);
    // Scale to map data to screen dimensions
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.x)])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([-1, 1])
        .range([height/2 + 100, height/2 - 100]);

    // Create line generator
    const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));

    // Update the path
    wavePath.attr("d", line(data));

    animationId = requestAnimationFrame(animateWave);
}

// Handle window resize
function handleResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width)
       .attr("height", height);
}

window.addEventListener('resize', handleResize);

// Start the animation
animateWave();
