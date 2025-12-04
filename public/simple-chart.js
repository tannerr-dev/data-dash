// Simple Chart JavaScript - A simplified version of the main chart functionality

// Sample data for demonstration
let chartData = [
    { month: 'Jan', sales: 120, date: new Date(2024, 0, 1) },
    { month: 'Feb', sales: 150, date: new Date(2024, 1, 1) },
    { month: 'Mar', sales: 180, date: new Date(2024, 2, 1) },
    { month: 'Apr', sales: 160, date: new Date(2024, 3, 1) },
    { month: 'May', sales: 200, date: new Date(2024, 4, 1) },
    { month: 'Jun', sales: 190, date: new Date(2024, 5, 1) },
    { month: 'Jul', sales: 220, date: new Date(2024, 6, 1) },
    { month: 'Aug', sales: 240, date: new Date(2024, 7, 1) },
    { month: 'Sep', sales: 210, date: new Date(2024, 8, 1) },
    { month: 'Oct', sales: 260, date: new Date(2024, 9, 1) },
    { month: 'Nov', sales: 280, date: new Date(2024, 10, 1) },
    { month: 'Dec', sales: 300, date: new Date(2024, 11, 1) }
];

let currentChartType = 'bar';

// Initialize the application
function initializeApp() {
    console.log('Initializing Simple Chart App');
    createChart(chartData, currentChartType);
    updateStats(chartData);
    
    // Initialize theme support
    import('./theme.js').then(({ themeManager }) => {
        themeManager.setChartUpdateCallback(updateChartColors);
    }).catch(err => {
        console.log('Theme manager not available');
    });
}

// Create the main chart visualization
function createChart(data, chartType = 'bar') {
    // Clear previous chart
    d3.select('#chart').selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select('#chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.sales) * 1.1])
        .range([height, 0]);

    // Create tooltip
    const tooltip = d3.select('#tooltip');

    if (chartType === 'bar') {
        createBarChart(g, data, xScale, yScale, tooltip, height);
    } else {
        createLineChart(g, data, xScale, yScale, tooltip, height, width);
    }

    // Add axes
    createAxes(g, xScale, yScale, height);
}

// Create bar chart
function createBarChart(g, data, xScale, yScale, tooltip, height) {
    g.selectAll('.bar')
        .data(data)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.month))
        .attr('width', xScale.bandwidth())
        .attr('y', d => yScale(d.sales))
        .attr('height', d => height - yScale(d.sales))
        .attr('fill', getCSSVariable('--bar'))
        .on('mouseover', function(event, d) {
            // Highlight bar
            d3.select(this)
                .attr('opacity', 1)
                .attr('fill', getCSSVariable('--chart-bar-hover'));
            
            // Show tooltip
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.month}</strong><br/>Sales: ${d.sales}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function(event, d) {
            // Reset bar
            d3.select(this)
                .attr('opacity', 0.8)
                .attr('fill', getCSSVariable('--bar'));
            
            // Hide tooltip
            tooltip.style('opacity', 0);
        });
}

// Create line chart
function createLineChart(g, data, xScale, yScale, tooltip, height, width) {
    // Convert band scale to point scale for line chart
    const xScaleLine = d3.scalePoint()
        .domain(data.map(d => d.month))
        .range([0, width]);

    // Create line generator
    const line = d3.line()
        .x(d => xScaleLine(d.month))
        .y(d => yScale(d.sales))
        .curve(d3.curveMonotoneX);

    // Add the line
    g.append('path')
        .datum(data)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', getCSSVariable('--trend-12month'))
        .attr('stroke-width', 3)
        .attr('d', line);

    // Add data points
    g.selectAll('.dot')
        .data(data)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScaleLine(d.month))
        .attr('cy', d => yScale(d.sales))
        .attr('r', 5)
        .attr('fill', getCSSVariable('--trend-12month'))
        .on('mouseover', function(event, d) {
            // Highlight point
            d3.select(this)
                .attr('r', 7)
                .attr('fill', getCSSVariable('--chart-bar-hover'));
            
            // Show tooltip
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.month}</strong><br/>Sales: ${d.sales}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function(event, d) {
            // Reset point
            d3.select(this)
                .attr('r', 5)
                .attr('fill', getCSSVariable('--trend-12month'));
            
            // Hide tooltip
            tooltip.style('opacity', 0);
        });
}

// Create chart axes
function createAxes(g, xScale, yScale, height) {
    // X axis
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    // Y axis
    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));

    // Axis labels
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - 40)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('fill', getCSSVariable('--text-secondary'))
        .text('Sales');

    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(${400}, ${height + 40})`)
        .style('text-anchor', 'middle')
        .style('fill', getCSSVariable('--text-secondary'))
        .text('Month');
}

// Switch between chart types
function switchChart(type) {
    currentChartType = type;
    
    // Update button states
    document.getElementById('barChartBtn').classList.toggle('inactive', type !== 'bar');
    document.getElementById('lineChartBtn').classList.toggle('inactive', type !== 'line');
    
    // Recreate chart
    createChart(chartData, type);
}

// Generate new random data
function refreshData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    chartData = months.map((month, index) => ({
        month: month,
        sales: Math.floor(Math.random() * 200) + 100, // Random sales between 100-300
        date: new Date(2024, index, 1)
    }));
    
    createChart(chartData, currentChartType);
    updateStats(chartData);
}

// Update statistics display
function updateStats(data) {
    const total = data.reduce((sum, d) => sum + d.sales, 0);
    const average = Math.round(total / data.length);
    const max = Math.max(...data.map(d => d.sales));
    const min = Math.min(...data.map(d => d.sales));
    
    const maxMonth = data.find(d => d.sales === max).month;
    const minMonth = data.find(d => d.sales === min).month;
    
    document.getElementById('summary-stats').innerHTML = `
        <div class="stats-item-quantity">Total Sales: ${total}</div>
        <div class="stats-item-avg">Average: ${average}</div>
        <div class="stats-item-intercept">Highest: ${max} (${maxMonth})</div>
        <div class="stats-item-slope">Lowest: ${min} (${minMonth})</div>
    `;
}

// Helper function to get CSS variables (same as main chart)
function getCSSVariable(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

// Update chart colors when theme changes
function updateChartColors() {
    console.log("Updating chart colors for theme change");
    
    // Update bars
    d3.selectAll('.bar')
        .attr('fill', getCSSVariable('--bar'));
    
    // Update lines
    d3.selectAll('.line')
        .attr('stroke', getCSSVariable('--trend-12month'));
    
    // Update dots
    d3.selectAll('.dot')
        .attr('fill', getCSSVariable('--trend-12month'));
    
    // Update axis text
    d3.selectAll('.axis text')
        .style('fill', getCSSVariable('--text-secondary'));
    
    // Update axis labels
    d3.selectAll('.axis-label')
        .style('fill', getCSSVariable('--text-secondary'));
}

// Global functions for button onclick handlers
window.switchChart = switchChart;
window.refreshData = refreshData;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeApp);