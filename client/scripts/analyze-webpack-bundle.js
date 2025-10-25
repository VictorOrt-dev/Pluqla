#!/usr/bin/env node

/**
 * WEBPACK BUNDLE ANALYZER
 * Analyse détaillée de la composition du bundle avec visualisation interactive
 */

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

// Get webpack config from react-scripts
const webpackConfig = require('react-scripts/config/webpack.config');

// Create production config
const config = webpackConfig('production');

// Add BundleAnalyzerPlugin
config.plugins.push(
  new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    reportFilename: path.join(__dirname, '../build/bundle-report.html'),
    openAnalyzer: false,
    generateStatsFile: true,
    statsFilename: path.join(__dirname, '../build/bundle-stats.json'),
    statsOptions: {
      source: false,
      reasons: true,
      modules: true,
      chunks: true,
      children: false,
    },
  })
);

console.log('🔍 Building with webpack-bundle-analyzer...\n');

// Run webpack
webpack(config, (err, stats) => {
  if (err) {
    console.error('❌ Webpack build failed:', err);
    process.exit(1);
  }

  if (stats.hasErrors()) {
    console.error('❌ Build errors:\n');
    stats.compilation.errors.forEach(error => {
      console.error(error);
    });
    process.exit(1);
  }

  console.log('\n✅ Bundle analysis complete!\n');
  console.log(`📊 Report: ${path.join(__dirname, '../build/bundle-report.html')}`);
  console.log(`📁 Stats: ${path.join(__dirname, '../build/bundle-stats.json')}\n`);

  // Parse stats to extract insights
  const statsJson = stats.toJson();

  console.log('📦 Top 10 Modules by Size:\n');

  const modules = statsJson.modules
    .filter(m => m.size > 1024) // > 1 KB
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  modules.forEach((mod, i) => {
    const sizeKB = (mod.size / 1024).toFixed(2);
    const name = mod.name.replace(/^.*node_modules\//, 'npm:').substring(0, 80);
    console.log(`  ${i + 1}. ${name}`);
    console.log(`     ${sizeKB} KB\n`);
  });

  console.log('\n🎯 Open bundle-report.html in your browser for interactive visualization\n');
});
