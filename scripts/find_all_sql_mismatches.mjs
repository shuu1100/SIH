import fs from 'fs';
import path from 'path';

const inventory = JSON.parse(fs.readFileSync('database_schema_inventory.json', 'utf8'));

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', '.next', '.git', '.system_generated', 'dist'].includes(item.name)) {
        results = results.concat(getAllFiles(full));
      }
    } else if (['.ts', '.tsx', '.js', '.mjs'].includes(path.extname(item.name))) {
      results.push(full);
    }
  }
  return results;
}

const files = [
  ...getAllFiles(path.resolve('app')),
  ...getAllFiles(path.resolve('lib')),
  ...getAllFiles(path.resolve('farmer profile')),
  ...getAllFiles(path.resolve('components')),
];

const results = [];

for (const f of files) {
  const relPath = path.relative(process.cwd(), f);
  const code = fs.readFileSync(f, 'utf8');

  // Extract template strings and quotes containing SQL keywords
  const sqlRegex = /(`[^`]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^`]*`|'[^']*\b(SELECT|INSERT|UPDATE|DELETE)\b[^']*'|"[^"]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^"]*")/gi;
  let match;

  while ((match = sqlRegex.exec(code)) !== null) {
    const sqlText = match[0].replace(/^[`'"]|[`'"]$/g, '');
    const lineNum = code.substring(0, match.index).split('\n').length;

    // Check queries against `users` table
    if (/\bFROM\s+users\b|\bINTO\s+users\b|\bUPDATE\s+users\b/i.test(sqlText)) {
      const validCols = inventory.users ? inventory.users.columnList : [];
      // Look for columns like phone, username, password, account_status, metadata
      for (const badCol of ['phone', 'username', 'password', 'account_status', 'metadata']) {
        const regex = new RegExp(`\\b${badCol}\\b`, 'i');
        if (regex.test(sqlText)) {
          results.push({
            file: relPath,
            line: lineNum,
            table: 'users',
            invalidColumn: badCol,
            sql: sqlText.trim().replace(/\s+/g, ' '),
            fix: `Column '${badCol}' does not exist on 'users' table (valid columns: ${validCols.join(', ')})`
          });
        }
      }
    }

    // Check queries against `farmers` table
    if (/\bFROM\s+farmers\b|\bINTO\s+farmers\b|\bUPDATE\s+farmers\b/i.test(sqlText)) {
      const validCols = inventory.farmers ? inventory.farmers.columnList : [];
      for (const badCol of ['user_id', 'farmer_id', 'area_acres']) {
        const regex = new RegExp(`\\b${badCol}\\b`, 'i');
        if (regex.test(sqlText)) {
          results.push({
            file: relPath,
            line: lineNum,
            table: 'farmers',
            invalidColumn: badCol,
            sql: sqlText.trim().replace(/\s+/g, ' '),
            fix: `Column '${badCol}' does not exist on 'farmers' table (valid columns: ${validCols.join(', ')})`
          });
        }
      }
    }

    // Check queries against `crops` table
    if (/\bFROM\s+crops\b|\bINTO\s+crops\b|\bUPDATE\s+crops\b/i.test(sqlText)) {
      const validCols = inventory.crops ? inventory.crops.columnList : [];
      // crops in RDS has: id, farmer_id, name, stage, sowing_date
      for (const badCol of ['area_acres', 'health_score', 'harvest_expected', 'variety', 'status', 'water_requirement']) {
        const regex = new RegExp(`\\b${badCol}\\b`, 'i');
        if (regex.test(sqlText)) {
          results.push({
            file: relPath,
            line: lineNum,
            table: 'crops',
            invalidColumn: badCol,
            sql: sqlText.trim().replace(/\s+/g, ' '),
            fix: `Column '${badCol}' does not exist on 'crops' table (valid columns: ${validCols.join(', ')})`
          });
        }
      }
    }

    // Check queries against `weather_observations` table
    if (/\bFROM\s+weather_observations\b/i.test(sqlText)) {
      const validCols = inventory.weather_observations ? inventory.weather_observations.columnList : [];
      for (const badCol of ['farmer_id', 'district']) {
        const regex = new RegExp(`\\b${badCol}\\b`, 'i');
        if (regex.test(sqlText)) {
          results.push({
            file: relPath,
            line: lineNum,
            table: 'weather_observations',
            invalidColumn: badCol,
            sql: sqlText.trim().replace(/\s+/g, ' '),
            fix: `Column '${badCol}' does not exist on 'weather_observations' (valid columns: ${validCols.join(', ')})`
          });
        }
      }
    }
  }
}

console.log(`Total verified SQL mismatches found: ${results.length}`);
console.log(JSON.stringify(results, null, 2));
fs.writeFileSync('verified_sql_mismatches.json', JSON.stringify(results, null, 2));
