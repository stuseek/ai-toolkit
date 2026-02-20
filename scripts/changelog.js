#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
const packagePath = path.join(__dirname, '..', 'package.json');

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageJson.version;

// Get latest git tag
let lastTag;
try {
  lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
} catch {
  lastTag = null;
}

// Get commits since last tag
let commits;
if (lastTag) {
  commits = execSync(`git log ${lastTag}..HEAD --oneline`, { encoding: 'utf8' }).trim();
} else {
  commits = execSync('git log --oneline -10', { encoding: 'utf8' }).trim();
}

// Parse commits
const commitLines = commits.split('\n').filter(Boolean);
const features = [];
const fixes = [];
const others = [];

commitLines.forEach(line => {
  const [hash, ...messageParts] = line.split(' ');
  const message = messageParts.join(' ');

  if (message.toLowerCase().includes('feat') || message.toLowerCase().includes('add')) {
    features.push(`- ${message}`);
  } else if (message.toLowerCase().includes('fix') || message.toLowerCase().includes('bug')) {
    fixes.push(`- ${message}`);
  } else {
    others.push(`- ${message}`);
  }
});

// Read existing changelog
let changelog = '';
if (fs.existsSync(changelogPath)) {
  changelog = fs.readFileSync(changelogPath, 'utf8');
}

// Create new entry
const date = new Date().toISOString().split('T')[0];
let newEntry = `## [${version}] - ${date}\n\n`;

if (features.length > 0) {
  newEntry += `### Added\n${features.join('\n')}\n\n`;
}

if (fixes.length > 0) {
  newEntry += `### Fixed\n${fixes.join('\n')}\n\n`;
}

if (others.length > 0) {
  newEntry += `### Changed\n${others.join('\n')}\n\n`;
}

// Update changelog
if (changelog.includes('# Changelog')) {
  // Insert after header
  changelog = changelog.replace(
    /# Changelog\n+/,
    `# Changelog\n\n${newEntry}`
  );
} else {
  // Create new changelog
  changelog = `# Changelog\n\n${newEntry}${changelog}`;
}

fs.writeFileSync(changelogPath, changelog);

console.log(`✅ Updated CHANGELOG.md for version ${version}`);