/**
 * Parser Module
 * Handles file parsing and metadata extraction.
 */

/**
 * Extracts metadata from a filename based on the specified convention:
 * param__[parameter]__well__[well]__exp[exposure]__int[intensity]__no[number]
 * 
 * @param {string} filename 
 * @returns {Object|null} Metadata object or null if parsing fails
 */
export function parseFilename(filename) {
    // Remove extension if present
    const name = filename.replace(/\.(csv|txt)$/i, '');

    // Regex to capture groups
    // param__(.*?) -> Group 1 (non-greedy)
    // __well__(.*?) -> Group 2 (non-greedy)
    // __exp(\d+) -> Group 3 (digits)
    // __int(\d+) -> Group 4 (digits)
    // __no(\d+) -> Group 5 (digits)
    const regex = /param__(.+?)__well__(.+?)__exp(\d+).*?__int(\d+).*?__no(\d+)/;
    
    const match = name.match(regex);

    if (!match) {
        console.warn(`Filename format not recognized: ${filename}`);
        return null;
    }

    return {
        parameter: match[1],
        well: match[2],
        exposure: parseInt(match[3], 10),
        intensity: parseInt(match[4], 10),
        imageNumber: parseInt(match[5], 10),
        originalName: filename
    };
}

/**
 * Parses a CSV file using PapaParse.
 * @param {File} file 
 * @returns {Promise<Array>} Promise resolving to array of data objects
 */
export function parseCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true, // Automatically converts numbers
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn('CSV Parse errors:', results.errors);
                }
                
                // transform data to ensure keys match what we need (trim spaces from headers if needed)
                const sanitizedData = results.data.map(row => {
                    // Start cleaning keys just in case
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.trim();
                        cleanRow[cleanKey] = row[key];
                    });
                    return cleanRow;
                });

                resolve(sanitizedData);
            },
            error: (err) => {
                reject(err);
            }
        });
    });
}
