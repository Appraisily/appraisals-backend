/**
 * Chart Validation Utility
 * 
 * Provides non-interruptive validation for charts, collecting issues into a report
 * rather than stopping or changing the process flow.
 */

/**
 * ValidationReport class to collect validation results
 */
class ValidationReport {
    constructor() {
        this.issues = [];
        this.chartStatuses = {};
        this.startTime = Date.now();
        this.finishTime = null;
        this.totalCharts = 0;
        this.successfulCharts = 0;
    }

    /**
     * Add an issue to the report
     * 
     * @param {string} chartId - ID of the chart with an issue
     * @param {string} chartType - Type of chart (radar, line, etc.)
     * @param {string} severity - Issue severity (error, warning, info)
     * @param {string} message - Description of the issue
     * @param {Object} details - Additional details about the issue
     */
    addIssue(chartId, chartType, severity, message, details = {}) {
        this.issues.push({
            chartId,
            chartType,
            severity,
            message,
            timestamp: new Date().toISOString(),
            details
        });
    }

    /**
     * Set chart status
     * 
     * @param {string} chartId - ID of the chart
     * @param {string} status - Status (success, error, partial)
     * @param {object} metadata - Additional information about the chart
     */
    setChartStatus(chartId, status, metadata = {}) {
        this.chartStatuses[chartId] = {
            status,
            metadata,
            timestamp: new Date().toISOString()
        };
        
        this.totalCharts++;
        if (status === 'success') {
            this.successfulCharts++;
        }
    }

    /**
     * Complete the report and calculate final metrics
     */
    finalize() {
        this.finishTime = Date.now();
        this.duration = this.finishTime - this.startTime;
        this.successRate = this.totalCharts ? (this.successfulCharts / this.totalCharts) * 100 : 0;
        
        // Sort issues by severity
        this.issues.sort((a, b) => {
            const severityOrder = { error: 0, warning: 1, info: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }

    /**
     * Get a summary of the validation report
     * 
     * @returns {Object} Summary of validation results
     */
    getSummary() {
        if (!this.finishTime) {
            this.finalize();
        }
        
        return {
            totalCharts: this.totalCharts,
            successfulCharts: this.successfulCharts,
            issueCount: this.issues.length,
            successRate: this.successRate.toFixed(1) + '%',
            duration: this.duration + 'ms',
            hasCriticalIssues: this.issues.some(issue => issue.severity === 'error'),
            topIssues: this.issues.slice(0, 3).map(issue => issue.message)
        };
    }

    /**
     * Get full details of the validation report
     * 
     * @returns {Object} Complete validation report
     */
    getFullReport() {
        if (!this.finishTime) {
            this.finalize();
        }
        
        return {
            summary: this.getSummary(),
            issues: this.issues,
            chartStatuses: this.chartStatuses,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Log the report to the console
     * 
     * @param {boolean} verbose - Whether to log the full report or just the summary
     */
    logToConsole(verbose = false) {
        const summary = this.getSummary();
        
        console.group('Chart Validation Report');
        console.log(`Success Rate: ${summary.successRate} (${summary.successfulCharts}/${summary.totalCharts})`);
        console.log(`Duration: ${summary.duration}`);
        
        if (summary.issueCount > 0) {
            console.group(`Issues Found: ${summary.issueCount}`);
            
            if (verbose) {
                this.issues.forEach((issue, index) => {
                    console.group(`Issue #${index + 1}: ${issue.chartId} (${issue.chartType})`);
                    console.log(`Severity: ${issue.severity}`);
                    console.log(`Message: ${issue.message}`);
                    if (Object.keys(issue.details).length > 0) {
                        console.log('Details:', issue.details);
                    }
                    console.groupEnd();
                });
            } else {
                // Group issues by severity
                const errorCount = this.issues.filter(i => i.severity === 'error').length;
                const warningCount = this.issues.filter(i => i.severity === 'warning').length;
                const infoCount = this.issues.filter(i => i.severity === 'info').length;
                
                console.log(`Errors: ${errorCount}, Warnings: ${warningCount}, Info: ${infoCount}`);
                console.log('Top Issues:');
                summary.topIssues.forEach(issue => console.log(`- ${issue}`));
            }
            
            console.groupEnd();
        } else {
            console.log('No issues found!');
        }
        
        console.groupEnd();
    }
}

/**
 * Validate a radar chart
 * 
 * @param {string} canvasId - ID of the chart canvas
 * @param {Object} chart - Chart.js instance
 * @param {ValidationReport} report - Validation report to update
 */
function validateRadarChart(canvasId, chart, report) {
    if (!chart) {
        report.addIssue(canvasId, 'radar', 'error', 'Chart instance not found', { canvasId });
        report.setChartStatus(canvasId, 'error', { reason: 'missing-instance' });
        return;
    }

    const issues = [];
    const metadata = {
        datasets: chart.data.datasets?.length || 0,
        labels: chart.data.labels?.length || 0
    };

    // Check for empty data
    if (!chart.data.datasets || chart.data.datasets.length === 0) {
        issues.push({ severity: 'error', message: 'No datasets found in chart' });
    } else {
        // Check each dataset
        chart.data.datasets.forEach((dataset, idx) => {
            if (!dataset.data || dataset.data.length === 0) {
                issues.push({ 
                    severity: 'error', 
                    message: `Dataset ${idx} has no data`,
                    details: { datasetLabel: dataset.label || `Dataset ${idx}` }
                });
            } else if (dataset.data.some(v => v === null || v === undefined)) {
                issues.push({ 
                    severity: 'warning', 
                    message: `Dataset ${idx} has missing data points`,
                    details: { datasetLabel: dataset.label || `Dataset ${idx}` }
                });
            }
        });
    }

    // Check for labels
    if (!chart.data.labels || chart.data.labels.length === 0) {
        issues.push({ severity: 'error', message: 'No labels found in chart' });
    }

    // Check canvas size (might indicate rendering issues)
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        if (canvas.width < 50 || canvas.height < 50) {
            issues.push({ 
                severity: 'warning', 
                message: 'Chart canvas is very small',
                details: { width: canvas.width, height: canvas.height }
            });
        }
    } else {
        issues.push({ severity: 'error', message: 'Chart canvas element not found in DOM' });
    }

    // Add all issues to the report
    issues.forEach(issue => {
        report.addIssue(
            canvasId, 
            'radar', 
            issue.severity, 
            issue.message, 
            issue.details || {}
        );
    });

    // Set chart status
    const errorIssues = issues.filter(i => i.severity === 'error');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    
    if (errorIssues.length > 0) {
        report.setChartStatus(canvasId, 'error', metadata);
    } else if (warningIssues.length > 0) {
        report.setChartStatus(canvasId, 'partial', metadata);
    } else {
        report.setChartStatus(canvasId, 'success', metadata);
    }
}

/**
 * Validate a line chart (price history)
 * 
 * @param {string} canvasId - ID of the chart canvas
 * @param {Object} chart - Chart.js instance
 * @param {ValidationReport} report - Validation report to update
 */
function validateLineChart(canvasId, chart, report) {
    if (!chart) {
        report.addIssue(canvasId, 'line', 'error', 'Chart instance not found', { canvasId });
        report.setChartStatus(canvasId, 'error', { reason: 'missing-instance' });
        return;
    }

    const issues = [];
    const metadata = {
        datasets: chart.data.datasets?.length || 0,
        labels: chart.data.labels?.length || 0
    };

    // Check for empty data
    if (!chart.data.datasets || chart.data.datasets.length === 0) {
        issues.push({ severity: 'error', message: 'No datasets found in chart' });
    } else {
        // Check each dataset
        chart.data.datasets.forEach((dataset, idx) => {
            if (!dataset.data || dataset.data.length === 0) {
                issues.push({ 
                    severity: 'error', 
                    message: `Dataset ${idx} has no data`,
                    details: { datasetLabel: dataset.label || `Dataset ${idx}` }
                });
            } else {
                // For line charts, null values are allowed for gaps, but check if all are null
                const allNull = dataset.data.every(v => v === null);
                const hasData = dataset.data.some(v => v !== null && v !== undefined);
                
                if (allNull) {
                    issues.push({ 
                        severity: 'error', 
                        message: `Dataset ${idx} has only null values`,
                        details: { datasetLabel: dataset.label || `Dataset ${idx}` }
                    });
                } else if (!hasData) {
                    issues.push({ 
                        severity: 'error', 
                        message: `Dataset ${idx} has no valid data points`,
                        details: { datasetLabel: dataset.label || `Dataset ${idx}` }
                    });
                }
            }
        });
    }

    // Check for labels
    if (!chart.data.labels || chart.data.labels.length === 0) {
        issues.push({ severity: 'error', message: 'No labels found in chart' });
    }

    // Check if special "Your Item" dataset exists (specific to price history chart)
    const hasYourItemDataset = chart.data.datasets.some(dataset => 
        dataset.label && dataset.label.includes('Your Item')
    );
    
    if (!hasYourItemDataset) {
        issues.push({ 
            severity: 'warning', 
            message: 'Missing "Your Item" dataset in price history chart'
        });
    }

    // Add all issues to the report
    issues.forEach(issue => {
        report.addIssue(
            canvasId, 
            'line', 
            issue.severity, 
            issue.message, 
            issue.details || {}
        );
    });

    // Set chart status
    const errorIssues = issues.filter(i => i.severity === 'error');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    
    if (errorIssues.length > 0) {
        report.setChartStatus(canvasId, 'error', metadata);
    } else if (warningIssues.length > 0) {
        report.setChartStatus(canvasId, 'partial', metadata);
    } else {
        report.setChartStatus(canvasId, 'success', metadata);
    }
}

/**
 * Validate charts on a page or container
 * 
 * @param {HTMLElement} container - Container to validate charts within (or document if not provided)
 * @param {boolean} verbose - Whether to log verbose report to console
 * @returns {ValidationReport} Validation report object
 */
function validateCharts(container = document, verbose = false) {
    console.log('Starting chart validation (non-interruptive)...');
    const report = new ValidationReport();
    
    // Get all canvases
    const canvases = container.querySelectorAll('canvas[id]');
    console.log(`Found ${canvases.length} chart canvases to validate`);
    
    // Validate each canvas
    canvases.forEach(canvas => {
        const canvasId = canvas.id;
        
        // Skip non-chart canvases
        if (!canvasId.includes('chart')) {
            return;
        }

        // Get chart instance
        const chart = window.EnhancedAnalyticsChart && 
                     window.EnhancedAnalyticsChart.getChart ? 
                     window.EnhancedAnalyticsChart.getChart(canvasId) : null;
        
        // Determine chart type
        let chartType = chart ? chart.config.type : 'unknown';
        
        // Use canvas ID as fallback to determine type
        if (!chart || chartType === 'unknown') {
            if (canvasId.includes('radar')) chartType = 'radar';
            else if (canvasId.includes('price')) chartType = 'line';
            else if (canvasId.includes('histogram') || canvasId.includes('distribution')) chartType = 'bar';
        }
        
        // Validate based on chart type
        try {
            if (chartType === 'radar') {
                validateRadarChart(canvasId, chart, report);
            } else if (chartType === 'line') {
                validateLineChart(canvasId, chart, report);
            } else {
                report.addIssue(
                    canvasId, 
                    chartType, 
                    'info', 
                    `Validation not implemented for chart type: ${chartType}`
                );
                report.setChartStatus(canvasId, 'unknown', { chartType });
            }
        } catch (error) {
            // Make sure validation errors don't interrupt the process
            report.addIssue(
                canvasId, 
                chartType, 
                'error', 
                'Error during chart validation', 
                { error: error.message, stack: error.stack }
            );
            report.setChartStatus(canvasId, 'error', { reason: 'validation-error' });
        }
    });
    
    // Generate and log report
    report.finalize();
    
    if (verbose) {
        report.logToConsole(true);
    } else {
        report.logToConsole(false);
    }
    
    return report;
}

// Export functions if using module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateCharts,
        ValidationReport
    };
} 