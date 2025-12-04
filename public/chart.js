async function fetchJSONData(){
    try {
        const response = await fetch('/api/dashboard_data');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch data:', error);
        return null;
    }
}

let salesData = [];
let allItemData = [];
let allItemKeys = [];
let filteredItems = [];

// Initialize the application
async function initializeApp() {
    // itemData = await fetchJSONData();
    allItemData = await fetchJSONData();
    // console.log("itemData", itemData);
    // Initialize slider display values
    console.log("all items keys", Object.keys(allItemData));

    if (allItemData) {
        // allItemData = itemData;

        populateItemDropdown(Object.keys(allItemData));


        // Load first item by default if available
        const firstKey = Object.keys(allItemData)[0];
        if (firstKey) {
            loadItemData(firstKey);
            document.getElementById('itemSelect').value = firstKey;
            updateNavigationButtons();
        }
        // updateVisualization();
    }
    // Custom calculations display will be updated when first item loads
}

// Populate the dropdown with item keys
function populateItemDropdown(itemKeys) {
    allItemKeys = [...itemKeys];
    filteredItems = [...itemKeys];

    const select = document.getElementById('itemSelect');
    // Clear existing options except the first one
    select.innerHTML = '<option value="">Select an item...</option>';

    itemKeys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        select.appendChild(option);
    });

    // Update results counter
    updateSearchCounter();

    // Update navigation buttons after populating dropdown
    updateNavigationButtons();
}

// Handle item selection
function onItemSelect() {
    const selectedItem = document.getElementById('itemSelect').value;
    if (selectedItem && allItemData[selectedItem]) {
        loadItemData(selectedItem);
    } else {
        // Clear the chart if no item is selected
        salesData = [];
        d3.select("#chart").selectAll("*").remove();
    }
}

// Item navigation functions
function navigateItem(direction) {
    const itemSelect = document.getElementById('itemSelect');
    const currentValue = itemSelect.value;

    if (filteredItems.length === 0) return;

    let currentIndex = filteredItems.indexOf(currentValue);

    if (currentIndex === -1) {
        currentIndex = 0;
    } else {
        currentIndex += direction;

        // Wrap around
        if (currentIndex >= filteredItems.length) {
            currentIndex = 0;
        } else if (currentIndex < 0) {
            currentIndex = filteredItems.length - 1;
        }
    }

    const newValue = filteredItems[currentIndex];
    itemSelect.value = newValue;
    loadItemData(newValue);
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const itemSelect = document.getElementById('itemSelect');
    const prevBtn = document.getElementById('prevItemBtn');
    const nextBtn = document.getElementById('nextItemBtn');

    if (!itemSelect || !prevBtn || !nextBtn) return;

    const currentIndex = itemSelect.selectedIndex;
    const totalItems = filteredItems.length;
    const hasValidSelection = currentIndex > 0; // Greater than 0 means not on placeholder

    // Update button titles with current position
    if (hasValidSelection && totalItems > 0) {
        const currentItemIndex = filteredItems.indexOf(itemSelect.value);
        const position = currentItemIndex + 1;
        prevBtn.title = `Previous Item (${position}/${totalItems})`;
        nextBtn.title = `Next Item (${position}/${totalItems})`;
    } else {
        prevBtn.title = "Previous Item";
        nextBtn.title = "Next Item";
    }

    // Enable/disable buttons based on selection
    if (hasValidSelection && totalItems > 1) {
        prevBtn.disabled = false;
        nextBtn.disabled = false;
        prevBtn.classList.remove('inactive');
        nextBtn.classList.remove('inactive');
    } else {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        prevBtn.classList.add('inactive');
        nextBtn.classList.add('inactive');
    }
}

// Search functionality
function filterItems() {
    const searchInput = document.getElementById('itemSearch');
    const clearBtn = document.getElementById('clearSearchBtn');
    const searchTerm = searchInput.value.toLowerCase();

    // Show/hide clear button
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'block' : 'none';
    }

    if (searchTerm === '') {
        filteredItems = [...allItemKeys];
    } else {
        filteredItems = allItemKeys.filter(item => 
            item.toLowerCase().includes(searchTerm)
        );
    }

    updateDropdownOptions();
}

function updateDropdownOptions() {
    const select = document.getElementById('itemSelect');
    const currentValue = select.value;

    // Clear existing options except the first one
    select.innerHTML = '<option value="">Select an item...</option>';

    filteredItems.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        select.appendChild(option);
    });

    // Restore selection if it's still in filtered items
    if (filteredItems.includes(currentValue)) {
        select.value = currentValue;
    } else if (filteredItems.length > 0) {
        // If current item is filtered out but there are matches, select first match
        select.value = filteredItems[0];
        onItemSelect();
    }

    updateSearchCounter();
    updateNavigationButtons();
}

function updateSearchCounter() {
    const counter = document.getElementById('searchResultsCounter');
    if (counter) {
        if (filteredItems.length === allItemKeys.length) {
            counter.textContent = `${filteredItems.length} items`;
        } else {
            counter.textContent = `${filteredItems.length} of ${allItemKeys.length} items`;
        }
    }
}

function clearSearch() {
    const searchInput = document.getElementById('itemSearch');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (searchInput) {
        searchInput.value = '';
    }
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    filteredItems = [...allItemKeys];
    updateDropdownOptions();
}

// Add keyboard navigation for search input
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('itemSearch');
    if (searchInput) {
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                if (filteredItems.length > 0) {
                    const select = document.getElementById('itemSelect');
                    select.value = filteredItems[0];
                    onItemSelect();
                }
            } else if (e.key === 'Escape') {
                clearSearch();
            }
        });
    }
});

// Make functions globally accessible
window.onItemSelect = onItemSelect;
window.filterItems = filterItems;
window.clearSearch = clearSearch;
window.navigateItem = navigateItem;
window.updateNavigationButtons = updateNavigationButtons;
window.toggleLine = toggleLine;
window.resetView = resetView;
window.updateButtonState = updateButtonState;
window.updateAllButtonStates = updateAllButtonStates;
window.updateCustomLine = updateCustomLine;

// Load data for selected item
function loadItemData(itemKey) {
    if (allItemData[itemKey]) {
        console.log("Loading data for:", itemKey);

        // Process the data
        salesData = allItemData[itemKey].slice(-25, -1);

        // Ensure dates are properly converted
        salesData.forEach(d => {
            if (typeof d.date === 'string') {
                d.date = new Date(d.date);
            }
        });

        // console.log("Processed salesData length:", salesData.length);

        // Reset line visibility to show all lines
        // lineVisibility = {
        //     line24: true,
        //     line12: true,
        //     line6: true,
        //     // line3: true
        //     line3: false
        // };

        // Update slider ranges based on new data
        updateSliderRanges();

        // Update custom line display with current parameters (after slider ranges are updated)
        const customCalc = calculateCustomLineQuantity(customLineParams.intercept, customLineParams.slope);
        updateCustomLineDisplay(customCalc);

        // Update visualization immediately
        createVisualization(salesData);
        updateAllButtonStates();
    }
}

// Start the application
initializeApp();

// Helper function to get CSS variable values (globally accessible)
window.getCSSVariable = function(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
};

// Function to update chart colors on theme change
function updateChartColors() {
    // console.log("updateChartColors called");
    if (salesData.length === 0) return;
    // Update bar colors
    d3.selectAll('.bar')
        .attr('fill', window.getCSSVariable('--chart-bar-fill'));
    // Update axis text colors
    d3.selectAll('.axis text')
        .style('fill', window.getCSSVariable('--chart-axis-text'));
    // Update axis label colors
    d3.selectAll('text[transform*="rotate"]')
        .style('fill', window.getCSSVariable('--chart-axis-text'));
    d3.selectAll('text[transform*="translate"]')
        .style('fill', window.getCSSVariable('--chart-axis-text'));
    // Update projection line colors
    d3.selectAll('.projection-line')
        .style('stroke', function(d, i) {
            const lineKeys = Object.keys(lineVisibility);
            const key = lineKeys[i];
            if (key === 'line24') return window.getCSSVariable('--trend-24month');
            if (key === 'line12') return window.getCSSVariable('--trend-12month');
            if (key === 'line6') return window.getCSSVariable('--trend-6month');
            if (key === 'line3') return window.getCSSVariable('--trend-custom');
            return window.getCSSVariable('--chart-stroke');
        });
    // Regenerate projections with new colors and update visualization
    const newProjections = generateProjections(salesData);
    updateVisualization();
    // Update navigation buttons after loading data
    updateNavigationButtons();
}

// Initialize theme manager with error handling
async function initializeTheme() {
    try {
        const themeModule = await import('./theme.js');
        if (themeModule && themeModule.themeManager) {
            themeModule.themeManager.setChartUpdateCallback(updateChartColors);
        } else {
            console.warn('Theme manager not found, theme switching may not work properly');
        }
    } catch (error) {
        console.warn('Failed to load theme module:', error);
        // Theme functionality will be disabled but chart will still work
    }
}

// Initialize theme manager
initializeTheme();

// Global variables for line visibility
let lineVisibility = {
    line24: true,
    line12: false,
    line6: false,
    line3: false,
};

// Custom line parameters
let customLineParams = {
    intercept: 0,
    slope: 0
};

// Helper function for linear regression
function linearRegression(data) {
    const n = data.length;
    const sumX = data.reduce((sum, d, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.sales, 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * d.sales, 0);
    const sumXX = data.reduce((sum, d, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

// Generate projection lines
function generateProjections(salesData) {
    const projections = {};

    // 24-month projection (starts from month 0)
    const data24 = salesData;
    const regression24 = linearRegression(data24);
    projections.line24 = {
        startIndex: 0,
        regression: regression24,
        color: window.getCSSVariable('--trend-24month'),
        label: '2-year trend'
    };

    // 12-month projection (starts from month 12)
    const data12 = salesData.slice(-12);
    const regression12 = linearRegression(data12);
    projections.line12 = {
        startIndex: 12,
        regression: regression12,
        color: window.getCSSVariable('--trend-12month'),
        label: '1-year trend'
    };

    // 6-month projection (starts from month 18)
    const data6 = salesData.slice(-6);
    const regression6 = linearRegression(data6);
    projections.line6 = {
        startIndex: 18,
        regression: regression6,
        color: window.getCSSVariable('--trend-6month'),
        label: '6-month trend'
    };

    // Custom projection (starts from end of historical data)
    projections.line3 = {
        startIndex: salesData.length - 1,
        regression: {
            intercept: customLineParams.intercept,
            slope: customLineParams.slope
        },
        color: window.getCSSVariable('--trend-custom'),
        label: 'Custom trend'
    };

    return projections;
}

// Toggle line visibility
function toggleLine(lineId) {
    lineVisibility[lineId] = !lineVisibility[lineId];
    updateVisualization();
    updateButtonState(lineId);
}

// Reset view to show all lines
function resetView() {
    Object.keys(lineVisibility).forEach(key => {
        lineVisibility[key] = true;
    });
    updateVisualization();
    updateAllButtonStates();
}

// Update button states
function updateButtonState(lineId) {
    const button = document.getElementById(`toggle-${lineId.replace('line', '')}`);
    if (lineVisibility[lineId]) {
        button.classList.remove('inactive');
    } else {
        button.classList.add('inactive');
    }
}

function updateAllButtonStates() {
    updateButtonState('line24');
    updateButtonState('line12');
    updateButtonState('line6');
    updateButtonState('line3');
}

// Update slider ranges based on current data
function updateSliderRanges() {
    if (!salesData || salesData.length === 0) return;

    // Calculate data statistics
    const salesValues = salesData.map(d => d.sales);
    const minSales = Math.min(...salesValues);
    const maxSales = Math.max(...salesValues);
    const avgSales = salesValues.reduce((a, b) => a + b, 0) / salesValues.length;
    const dataRange = maxSales - minSales;

    // Set intercept range based on data range (±2x the data range around average)
    const interceptMin = minSales;
    const interceptMax = maxSales;
    // const interceptMin = Math.floor(avgSales - dataRange); // This is the default
    // const interceptMax = Math.ceil(avgSales + dataRange); // This is the default
    const interceptStep = Math.max(1, Math.floor(dataRange / 100));

    // Set slope range based on data variability (what would be reasonable monthly change)
    const monthlyChangeEstimate = dataRange / salesData.length / 2;
    // const monthlyChangeEstimate = dataRange / salesData.length; // This is the default
    const slopeMin = Math.floor(-monthlyChangeEstimate);
    const slopeMax = Math.ceil(monthlyChangeEstimate);
    // const slopeMin = Math.floor(-monthlyChangeEstimate * 2); // This is the default
    // const slopeMax = Math.ceil(monthlyChangeEstimate * 2); // This is the default
    const slopeStep = Math.max(0.1, Math.floor(monthlyChangeEstimate / 20));

    // Update intercept slider
    const interceptSlider = document.getElementById('interceptSlider');
    interceptSlider.min = interceptMin;
    interceptSlider.max = interceptMax;
    interceptSlider.step = interceptStep;

    // Reset to reasonable default (current average)
    interceptSlider.value = Math.round(avgSales);
    customLineParams.intercept = Math.round(avgSales);

    // Update slope slider
    const slopeSlider = document.getElementById('slopeSlider');
    slopeSlider.min = slopeMin;
    slopeSlider.max = slopeMax;
    slopeSlider.step = slopeStep;

    // Reset slope to 0
    slopeSlider.value = 0;
    customLineParams.slope = 0;

    // Update custom line display with new parameters
    const customCalc = calculateCustomLineQuantity(customLineParams.intercept, customLineParams.slope);
    updateCustomLineDisplay(customCalc);

    // Update value displays

    console.log('Updated slider ranges:', {
        intercept: {min: interceptMin, max: interceptMax, step: interceptStep},
        slope: {min: slopeMin, max: slopeMax, step: slopeStep},
        dataStats: {min: minSales, max: maxSales, avg: avgSales, range: dataRange}
    });
}

// Update trend statistics display
function updateTrendStats(projections) {
    const statsContent = document.getElementById('statsContent');
    let statsHTML = '';

    Object.keys(projections).filter(key => key !== 'line3').forEach(key => {
        const proj = projections[key];
        const lineInfo = lineVisibility[key];
        const isVisible = lineInfo ? 'visible' : 'hidden';
        const opacity = lineInfo ? '1' : '0.5';

        // Calculate quantities for this trend line with appropriate data length
        let dataLength = null;
        if (key === 'line12') {
            dataLength = 12; // 12-month trend uses last 12 months
        } else if (key === 'line6') {
            dataLength = 6; // 6-month trend uses last 6 months
        }
        // line24 uses null (full dataset)

        const quantities = calculateTrendLineQuantity(proj.regression, 12, dataLength);

        statsHTML += `
            <div class="stats-item" style="border-left-color: ${proj.color}; opacity: ${opacity};">
                <div class="stats-item-title" style="color: ${proj.color};">
                    ${proj.label} (${isVisible})
                </div>
                <div class="stats-item-quantity">Projected Quantity over 1 year:</div>
                <div class="stats-item-quantity">${Math.round(quantities.totalQuantity).toLocaleString()}</div>
                <div class="stats-item-avg">Projected Average Monthly:</div>
                <div class="stats-item-avg">${quantities.averageMonthly.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                <hr style="margin: 8px 0; border: none; border-top: 1px solid var(--border-light); opacity: 0.5;">
                <div class="stats-item-intercept">Intercept: ${proj.regression.intercept.toFixed(2)}</div>
                <div class="stats-item-slope">Slope: ${proj.regression.slope.toFixed(2)}/month</div>
                <div class="stats-item-formula">
                    Formula: y = ${proj.regression.intercept.toFixed(2)} + ${proj.regression.slope.toFixed(2)}x
                </div>
            </div>
        `;
    });

    statsContent.innerHTML = statsHTML;
}

// Calculate trend line quantities for any regression line
function calculateTrendLineQuantity(regression, months = 12, dataLength = null) {
    // Input validation
    if (!regression || typeof regression.intercept !== 'number' || typeof regression.slope !== 'number') {
        console.error('Invalid regression object:', regression);
        return { totalQuantity: 0, averageMonthly: 0 };
    }
    
    if (months <= 0 || months > 120) { // Cap at 10 years maximum
        console.warn('Invalid months parameter:', months, 'using default of 12');
        months = 12;
    }
    
    if (!salesData || salesData.length === 0) {
        console.warn('No sales data available for trend calculation');
        return { totalQuantity: 0, averageMonthly: 0 };
    }

    let totalQuantity = 0;
    const maxProjectedValue = 1000000; // Reasonable upper bound to prevent overflow

    console.log('Calculating trend line quantity with regression:', regression, 'months:', months, 'dataLength:', dataLength);

    // Calculate where the regression line would be at the end of the data used for regression
    // For sliced data (12-month, 6-month), the regression was calculated on indices 0 to dataLength-1
    // For full data (24-month), the regression was calculated on indices 0 to salesData.length-1
    const endOfRegressionIndex = dataLength ? Math.max(0, dataLength - 1) : Math.max(0, salesData.length - 1);
    const startingValue = regression.intercept + (regression.slope * endOfRegressionIndex);

    // Validate starting value
    if (!isFinite(startingValue)) {
        console.error('Invalid starting value calculated:', startingValue);
        return { totalQuantity: 0, averageMonthly: 0 };
    }

    console.log(`Starting projection from end of regression data (index ${endOfRegressionIndex}): ${startingValue.toFixed(2)}`);

    // Calculate projected values for the NEXT specified number of months
    for (let i = 1; i <= months; i++) {
        const projectedValue = startingValue + (regression.slope * i);
        
        // Validate projected value
        if (!isFinite(projectedValue)) {
            console.warn(`Invalid projected value at month ${i}:`, projectedValue);
            continue;
        }
        
        // Ensure non-negative values and apply upper bound
        const clampedValue = Math.max(0, Math.min(projectedValue, maxProjectedValue));
        totalQuantity += clampedValue;

        if (i <= 3) { // Log first 3 values for debugging
            console.log(`Future Month ${i}: projected=${projectedValue.toFixed(2)}, clamped=${clampedValue.toFixed(2)}`);
        }
    }

    const result = {
        totalQuantity: totalQuantity,
        averageMonthly: totalQuantity / months
    };

    console.log('Trend line calculation result:', result);
    return result;
}

// Update custom line parameters and refresh visualization
function calculateCustomLineQuantity(intercept, slope, months = 12) {
    // Input validation
    if (typeof intercept !== 'number' || typeof slope !== 'number') {
        console.error('Invalid intercept or slope values:', { intercept, slope });
        return { 
            totalQuantity: 0, 
            averageMonthly: 0, 
            formula: 'y = 0 + 0x (Invalid input)' 
        };
    }
    
    if (!isFinite(intercept) || !isFinite(slope)) {
        console.error('Non-finite intercept or slope values:', { intercept, slope });
        return { 
            totalQuantity: 0, 
            averageMonthly: 0, 
            formula: 'y = 0 + 0x (Invalid input)' 
        };
    }
    
    if (months <= 0 || months > 120) { // Cap at 10 years maximum
        console.warn('Invalid months parameter:', months, 'using default of 12');
        months = 12;
    }

    let totalQuantity = 0;
    const maxProjectedValue = 1000000; // Reasonable upper bound to prevent overflow

    // console.log('Calculating custom line quantity with intercept:', intercept, 'slope:', slope, 'months:', months);

    // For custom line, the intercept represents the starting value at current time
    // So we project forward from the intercept for the NEXT specified months
    console.log(`Custom line starting from intercept: ${intercept.toFixed(2)}`);

    // Calculate projected values for the NEXT specified number of months
    for (let i = 1; i <= months; i++) {
        const projectedValue = intercept + (slope * i);
        
        // Validate projected value
        if (!isFinite(projectedValue)) {
            console.warn(`Invalid projected value at month ${i}:`, projectedValue);
            continue;
        }
        
        // Ensure non-negative values and apply upper bound
        const clampedValue = Math.max(0, Math.min(projectedValue, maxProjectedValue));
        totalQuantity += clampedValue;

        if (i <= 3) { // Log first 3 values for debugging
            console.log(`Custom Future Month ${i}: projected=${projectedValue.toFixed(2)}, clamped=${clampedValue.toFixed(2)}`);
        }
    }

    const result = {
        totalQuantity: totalQuantity,
        averageMonthly: totalQuantity / months,
        formula: `y = ${intercept.toFixed(2)} + ${slope.toFixed(2)}x`
    };

    // console.log('Calculation result:', result);
    return result;
}

function updateCustomLine() {
    // console.log('updateCustomLine called');
    const interceptSlider = document.getElementById('interceptSlider');
    const slopeSlider = document.getElementById('slopeSlider');
    customLineParams.intercept = parseFloat(interceptSlider.value);
    customLineParams.slope = parseFloat(slopeSlider.value);

    // console.log('Updated params:', customLineParams);

    // Calculate and display custom line quantity
    const quantityCalc = calculateCustomLineQuantity(customLineParams.intercept, customLineParams.slope);
    updateCustomLineDisplay(quantityCalc);

    // Only update if we have data loaded
    if (salesData && salesData.length > 0) {
        console.log('Updating visualization with salesData length:', salesData.length);
        updateVisualization();
    } else {
        console.log('No salesData available for update');
    }
}

function updateCustomLineDisplay(quantityCalc) {
    // console.log('Updating custom line display with:', quantityCalc);

    // Update custom quantity display elements
    const totalQuantityElement = document.getElementById('customTotalQuantity');
    const avgQuantityElement = document.getElementById('customAvgQuantity');
    const formulaElement = document.getElementById('customFormula');

    // console.log('Display elements found:', {
    //     total: !!totalQuantityElement,
    //     avg: !!avgQuantityElement,
    //     formula: !!formulaElement
    // });

    if (totalQuantityElement) {
        // Format large numbers with commas for better readability
        const formattedTotal = Math.round(quantityCalc.totalQuantity).toLocaleString();
        totalQuantityElement.textContent = formattedTotal;
    } else {
        console.warn('customTotalQuantity element not found');
    }

    if (avgQuantityElement) {
        const formattedAvg = quantityCalc.averageMonthly.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        avgQuantityElement.textContent = formattedAvg;
    } else {
        console.warn('customAvgQuantity element not found');
    }

    if (formulaElement) {
        formulaElement.textContent = quantityCalc.formula;
    } else {
        console.warn('customFormula element not found');
    }
}

// Main visualization function
function createVisualization(salesData) {

    // Clear previous chart
    d3.select('#chart').selectAll('*').remove();

    const margin = {top: 20, right: 80, bottom: 60, left: 80};
    const width = 1000 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select('#chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
        .domain([
            d3.timeMonth.offset(salesData[0].date, -1),
            d3.timeMonth.offset(salesData[salesData.length - 1].date, 13)
        ])
        .range([0, width]);

    const allSalesValues = salesData.map(d => d.sales);
    const projections = generateProjections(salesData);

    // Calculate max projected value for y-scale
    let maxProjectedValue = d3.max(allSalesValues);
    Object.keys(projections).forEach(key => {
        const proj = projections[key];
        const futureValue = proj.regression.intercept + proj.regression.slope * 18; // 18 months out
        maxProjectedValue = Math.max(maxProjectedValue, futureValue);
    });

    const yScale = d3.scaleLinear()
        .domain([0, maxProjectedValue * 1.1])
        .range([height, 0]);

    // Add projected area background
    g.append('rect')
        .attr('class', 'projected-section')
        .attr('x', xScale(salesData[salesData.length - 1].date))
        .attr('y', 0)
        .attr('width',
            xScale(d3.timeMonth.offset(salesData[salesData.length - 1].date, 12))
                - xScale(salesData[salesData.length - 1].date))
        .attr('height', height);

    // Tooltip
    const tooltip = d3.select('#tooltip');

    // Draw bars for actual sales data
    g.selectAll('.bar')
        .data(salesData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.date))
        .attr('width', Math.max(1, (width / salesData.length) - 18))
        .attr('y', d => yScale(d.sales))
        .attr('height', d => height - yScale(d.sales))
        .attr('fill', window.getCSSVariable('--chart-bar-fill'))
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
            tooltip.style('opacity', 1)
                .html(`Date: ${d3.timeFormat('%b %Y')(d.date)}<br/>Sales Qty: ${d.sales.toLocaleString()}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('opacity', 0);
        });

    // Draw projection lines
    drawProjectionLines(g, projections, salesData, xScale, yScale);

    // Update trend statistics display
    updateTrendStats(projections);

    // Add vertical line to separate actual vs projected
    const currentDate = salesData[salesData.length - 1].date;
    g.append('line')
        .attr('class', 'current-date-line')
        .attr('x1', xScale(currentDate))
        .attr('x2', xScale(currentDate))
        .attr('y1', 0)
        .attr('y2', height);

    // Add axes
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%b %Y')));

    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale).tickFormat(d => `${d/1000}k`));

    // Add axis labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', window.getCSSVariable('--chart-axis-text'))
        .text('Item Sales Qty');

    g.append('text')
        .attr('transform', `translate(${width/2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', window.getCSSVariable('--chart-axis-text'));
        // .text('Date');
}
function drawProjectionLines(g, projections, salesData, xScale, yScale) {
    Object.keys(projections).forEach(key => {
        if (!lineVisibility[key]) return;

        const proj = projections[key];
        const lineData = [];

        // Generate line points from start index to 12 months in future
        const totalDataPoints = salesData.length;
        const projectionMonths = 12;
        const endIndex = totalDataPoints + projectionMonths;
        
        // Validate startIndex to prevent array access errors
        const safeStartIndex = Math.max(0, Math.min(proj.startIndex, totalDataPoints - 1));
        
        for (let i = safeStartIndex; i < endIndex; i++) {
            const adjustedIndex = i - safeStartIndex;
            const predictedSales = proj.regression.intercept + proj.regression.slope * adjustedIndex;
            
            let date;
            let isProjected;
            
            if (i < totalDataPoints) {
                // Historical data point
                date = salesData[i].date;
                isProjected = false;
            } else {
                // Future projection point
                const monthsInFuture = i - totalDataPoints + 1;
                date = d3.timeMonth.offset(salesData[totalDataPoints - 1].date, monthsInFuture);
                isProjected = true;
            }

            lineData.push({
                date: date,
                sales: Math.max(0, predictedSales), // Ensure non-negative values
                isProjected: isProjected
            });
        }

        // Line generator
        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.sales));

        // Draw the line with different styles for actual vs projected
        const actualData = lineData.filter(d => !d.isProjected);
        const projectedData = lineData.filter(d => d.isProjected);

        // Add the last actual point to projected data for continuity
        if (actualData.length > 0) {
            projectedData.unshift(actualData[actualData.length - 1]);
        }

        // Draw actual portion (solid line)
        if (actualData.length > 1) {
            g.append('path')
                .datum(actualData)
                .attr('fill', 'none')
                .attr('stroke', proj.color)
                .attr('stroke-width', 3)
                .attr('d', line);
        }

        // Draw projected portion (dashed line)
        if (projectedData.length > 1) {
            g.append('path')
                .datum(projectedData)
                .attr('fill', 'none')
                .attr('stroke', proj.color)
                .attr('stroke-width', 3)
                .attr('stroke-dasharray', '5,5')
                .attr('d', line);
        }

        // Add line label
        const lastPoint = lineData[lineData.length - 1];
        g.append('text')
            .attr('x', xScale(lastPoint.date) + 5)
            .attr('y', yScale(lastPoint.sales))
            .attr('fill', proj.color)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text(proj.label);
    });
}


function updateVisualization() {
    if (salesData.length > 0) {
        createVisualization(salesData);
    } else {
        console.log("No data available for visualization yet");
    }
}
