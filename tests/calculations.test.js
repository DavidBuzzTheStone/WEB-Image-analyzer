import { describe, it, expect, beforeAll } from 'vitest';
import { calculateStats, calculateHierarchicalStats, isPointIncluded, mean, median } from '../modules/charts.js';
import fs from 'fs';
import path from 'path';

// Load test data
const testProject = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../test_project.json'), 'utf-8'));
const datasets = testProject.datasets;

// Helper to find dataset by ID pattern
const findDS = (pattern) => datasets.find(d => d.id.includes(pattern));
const findWellDS = (well) => datasets.filter(d => d.metadata.well === well);
const findParamDS = (param) => datasets.filter(d => d.metadata.parameter === param);

describe('Statistical Calculations', () => {

  describe('Basic Stats (Distributions)', () => {
    // Data: [1, 1, 10] -> Mean: 4, Median: 1
    it('should calculate correct Mean/Median for skewed A01 Image 1', () => {
        const ds = findDS('A01__exp1__int1__no1');
        const stats = calculateStats(ds.data);
        
        expect(stats.meanInt).toBe(4);
        expect(stats.medianInt).toBe(1);
    });

    // Data: [2, 2, 20] -> Mean: 8, Median: 2
    it('should calculate correct Mean/Median for skewed A01 Image 2', () => {
        const ds = findDS('A01__exp1__int1__no2');
        const stats = calculateStats(ds.data);
        
        expect(stats.meanInt).toBe(8);
        expect(stats.medianInt).toBe(2);
    });
  });

  describe('Hierarchical Aggregation', () => {
    // View Mode: Well
    // Aggregates Image Means (or raw data depending on logic)
    // From Project Notes: "Combined [1,1,2,2,10,20]" -> Mean: 6, Median: 2
    // BUT charts.js currently implements "Mean of Image Means" in calculateHierarchicalStats for 'well' mode?
    // Let's check logic:
    // charts.js:598 // Mean of Image Means (or Counts)
    // Image 1 Mean: 4
    // Image 2 Mean: 8
    // Mean of Means: (4+8)/2 = 6. 
    // This matches user expectation for Mean, but Median calculation isn't standard in hierarchical stats usually.
    // charts.js only returns { mean, error }.
    
    it('should calculate correct Well Mean (Aggregation of Image Means)', () => {
        const wellDatasets = findWellDS('A01');
        const stats = calculateHierarchicalStats(wellDatasets, 'well', null, 'int');
        
        // Image 1 Mean: 4
        // Image 2 Mean: 8
        // Mean of Means: 6
        expect(stats.mean).toBe(6);
    });

    // View Mode: Parameter
    // "Mean of Well Means"
    // Well B01: 3 images, each has one point [10]. Mean = 10.
    // Well B02: 1 image, point [90]. Mean = 90.
    // Parameter Mean = (10 + 90) / 2 = 50.
    // If it were "Mean of Images" it would be (10+10+10+90)/4 = 30.
    it('should calculate correct Parameter Mean (Mean of Well Means)', () => {
        const paramDatasets = findParamDS('Levels');
        const stats = calculateHierarchicalStats(paramDatasets, 'parameter', null, 'int');
        
        expect(stats.mean).toBe(50);
        expect(stats.mean).not.toBe(30);
    });
  });

  describe('Threshold Filtering', () => {
    // Project Notes:
    // Thresholds: Int [50-500], Area > 5
    // Data:
    // { "IntegratedInt": 100, "NArea": 10 } -> KEEP
    // { "IntegratedInt": 20, "NArea": 10 } -> REJECT (Int too low)
    // { "IntegratedInt": 800, "NArea": 10 } -> REJECT (Int too high)
    // { "IntegratedInt": 100, "NArea": 2 }  -> REJECT (Area too low)
    
    const thresholds = {
        type: 'area_int',
        values: {
            intMin: 50,
            intMax: 500,
            areaMin: 5
        }
    };

    it('should include points within range', () => {
        const row = { IntegratedInt: 100, NArea: 10 };
        expect(isPointIncluded(row, thresholds)).toBe(true);
    });

    it('should exclude points with low Intensity', () => {
        const row = { IntegratedInt: 20, NArea: 10 };
        expect(isPointIncluded(row, thresholds)).toBe(false);
    });

    it('should exclude points with high Intensity', () => {
        const row = { IntegratedInt: 800, NArea: 10 };
        expect(isPointIncluded(row, thresholds)).toBe(false);
    });

    it('should exclude points with low Area', () => {
        const row = { IntegratedInt: 100, NArea: 2 };
        expect(isPointIncluded(row, thresholds)).toBe(false);
    });
  });
});
