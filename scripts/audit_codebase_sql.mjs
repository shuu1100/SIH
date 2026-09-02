import fs from 'fs';
import path from 'path';

const inventory = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'database_schema_inventory.json'), 'utf8'));

const tableNames = Object.keys(inventory);
console.log(`Auditing against ${tableNames.length} tables in RDS database:`, tableNames.join(', '));

function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.mjs']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git' && entry.name !== '.system_generated') {
        files = files.concat(getAllFiles(fullPath, exts));
      }
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = [
  ...getAllFiles(path.resolve(process.cwd(), 'app')),
  ...getAllFiles(path.resolve(process.cwd(), 'lib')),
  ...getAllFiles(path.resolve(process.cwd(), 'farmer profile')),
  ...getAllFiles(path.resolve(process.cwd(), 'components')),
  ...getAllFiles(path.resolve(process.cwd(), 'scripts')),
];

console.log(`Found ${allFiles.length} source code files to audit.`);

const issues = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check for `FROM users` or `INSERT INTO users` or `UPDATE users`
    // If querying `users`, check if referencing `phone`, `password`, `username`, `metadata`, `account_status`
    if (/\b(FROM|INTO|UPDATE|JOIN)\s+users\b/i.test(line) || (line.includes('users') && /\b(SELECT|INSERT|UPDATE|WHERE)\b/i.test(line))) {
      const invalidUserCols = ['phone', 'username', 'password', 'metadata', 'account_status'];
      for (const col of invalidUserCols) {
        // match column word
        const regex = new RegExp(`\\b${col}\\b`, 'i');
        if (regex.test(line) && !line.includes('//') && !line.includes('CREATE TABLE')) {
          issues.push({
            file: path.relative(process.cwd(), filePath),
            line: lineNum,
            table: 'users',
            invalidColumn: col,
            lineContent: line.trim(),
            description: `Table 'users' in RDS does not have column '${col}'. Valid columns: [${inventory.users.columnList.join(', ')}]`
          });
        }
      }
    }

    // Check for `officer_interventions` vs `interventions` if any file still references wrong columns
    if (/\b(FROM|INTO|UPDATE|JOIN)\s+officer_interventions\b/i.test(line)) {
      if (!inventory.officer_interventions) {
        issues.push({
          file: path.relative(process.cwd(), filePath),
          line: lineNum,
          table: 'officer_interventions',
          invalidColumn: 'TABLE_DOES_NOT_EXIST',
          lineContent: line.trim(),
          description: `Table 'officer_interventions' is referenced but database table might be 'interventions'`
        });
      }
    }

    // Check for missing tables
    const sqlTableMatch = line.match(/\b(?:FROM|INTO|UPDATE|JOIN)\s+([a-zA-Z0-9_]+)\b/i);
    if (sqlTableMatch) {
      const referencedTable = sqlTableMatch[1].toLowerCase();
      // Ignore SQL keywords
      const sqlKeywords = ['select', 'set', 'where', 'values', 'inner', 'left', 'right', 'outer', 'full', 'cross', 'join', 'group', 'order', 'limit', 'on', 'as', 'table', 'if', 'exists', 'default', 'null', 'case', 'when', 'then', 'else', 'end', 'primary', 'key', 'index', 'constraint', 'foreign', 'references', 'view', 'function', 'procedure', 'trigger', 'database', 'schema', 'dual'];
      if (!sqlKeywords.includes(referencedTable) && !inventory[referencedTable] && !inventory[referencedTable.toLowerCase()]) {
        // check if it looks like real SQL
        if (/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(line) || /query\s*\(/i.test(line) || /pool\./i.test(line)) {
          issues.push({
            file: path.relative(process.cwd(), filePath),
            line: lineNum,
            table: referencedTable,
            invalidColumn: 'NON_EXISTENT_TABLE',
            lineContent: line.trim(),
            description: `Table '${referencedTable}' does not exist in AWS RDS MySQL.`
          });
        }
      }
    }

    // Check `farmers` table column references
    if (/\b(FROM|INTO|UPDATE|JOIN)\s+farmers\b/i.test(line)) {
      if (inventory.farmers) {
        // Check for common wrong columns like `farmer_id`, `userId`, `user_id` on farmers table
        const invalidFarmerCols = ['user_id', 'farmer_id', 'userId', 'mobile'];
        for (const col of invalidFarmerCols) {
          const regex = new RegExp(`\\b${col}\\b`, 'i');
          if (regex.test(line) && !line.includes('//')) {
            issues.push({
              file: path.relative(process.cwd(), filePath),
              line: lineNum,
              table: 'farmers',
              invalidColumn: col,
              lineContent: line.trim(),
              description: `Table 'farmers' has column 'id' / 'phone', not '${col}'. Valid columns: [${inventory.farmers.columnList.join(', ')}]`
            });
          }
        }
      }
    }

    // Check `risk_scores` table column references
    if (/\b(FROM|INTO|UPDATE|JOIN)\s+risk_scores\b/i.test(line)) {
      if (inventory.risk_scores) {
        const cols = inventory.risk_scores.columnList;
        // e.g. check if code uses `score` vs `overall_score`
        if (/\bscore\b/i.test(line) && !/\boverall_score\b/i.test(line) && !cols.includes('score')) {
          issues.push({
            file: path.relative(process.cwd(), filePath),
            line: lineNum,
            table: 'risk_scores',
            invalidColumn: 'score',
            lineContent: line.trim(),
            description: `Table 'risk_scores' uses column 'overall_score', not 'score'. Valid columns: [${cols.join(', ')}]`
          });
        }
      }
    }
  });
}

console.log(`\n================ AUDIT SUMMARY ================`);
console.log(`Total potential schema mismatch issues found: ${issues.length}`);
console.log(JSON.stringify(issues, null, 2));

fs.writeFileSync(path.resolve(process.cwd(), 'audit_issues.json'), JSON.stringify(issues, null, 2));
