const fs = require('fs');
const path = require('path');
const REQUIRED_HEADERS = [
  '姓名',
  '性别',
  '年龄',
  '课程种类',
  '报课次数',
  '总金额',
  '已上课次数',
  '剩余课时'
];

function getDb() {
  return require('../src/db');
}


function printHelp() {
  console.log(`\n一次性导入 students CSV 到 PostgreSQL\n\n用法:\n  node scripts/import_students.js --file ./student.csv [--dry-run]\n\n参数:\n  --file <path>   CSV 文件路径（默认: ./student.csv）\n  --dry-run       仅预演校验与统计，不写入数据库\n  --help          显示帮助\n`);
}

function parseArgs(argv) {
  const args = {
    file: './student.csv',
    dryRun: false,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') {
      args.dryRun = true;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (token === '--file') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('参数错误: --file 需要传入路径');
      }
      args.file = value;
      i += 1;
    } else {
      throw new Error(`未知参数: ${token}`);
    }
  }

  return args;
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function normalizeCsvContent(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';

  // 兼容从 IM 里粘贴的单行 "\\n" 文本
  if (!text.includes('\n') && text.includes('\\n')) {
    return text.replace(/\\n/g, '\n');
  }

  return text;
}

function parseGender(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['男', 'male', 'm'].includes(normalized)) return 'male';
  if (['女', 'female', 'f'].includes(normalized)) return 'female';
  if (['其他', 'other', 'o'].includes(normalized)) return 'other';
  return null;
}

function parseAge(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  const matchNumber = raw.match(/(\d+)/);
  if (matchNumber) {
    return Number(matchNumber[1]);
  }

  const gradeMap = {
    幼儿园: 6,
    一年级: 7,
    二年级: 8,
    三年级: 9,
    四年级: 10,
    五年级: 11,
    六年级: 12,
    初一: 13,
    初二: 14,
    初三: 15
  };

  if (gradeMap[raw] !== undefined) {
    return gradeMap[raw];
  }

  return null;
}

function parseNonNegativeInt(value) {
  const text = String(value || '').trim();
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

function parseNonNegativeDecimal(value) {
  const text = String(value || '').trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

function toStudentRecord(raw, lineNo) {
  const issues = [];

  for (const header of REQUIRED_HEADERS) {
    if (!String(raw[header] || '').trim()) {
      issues.push(`缺少必填字段: ${header}`);
    }
  }

  const name = String(raw.姓名 || '').trim();
  const gender = parseGender(raw.性别);
  const age = parseAge(raw.年龄);
  const courseType = String(raw.课程种类 || '').trim();
  const enrollCount = parseNonNegativeInt(raw.报课次数);
  const totalAmount = parseNonNegativeDecimal(raw.总金额);
  const attendedCount = parseNonNegativeInt(raw.已上课次数);
  const remainingLessons = parseNonNegativeInt(raw.剩余课时);

  if (name.length > 100) {
    issues.push('姓名长度超过 100');
  }
  if (!gender) {
    issues.push(`性别不合法: ${raw.性别}`);
  }
  if (!Number.isInteger(age) || age < 0) {
    issues.push(`年龄不合法: ${raw.年龄}`);
  }
  if (!courseType) {
    issues.push('课程种类不能为空');
  }
  if (!Number.isInteger(enrollCount) || enrollCount < 0) {
    issues.push(`报课次数不合法: ${raw.报课次数}`);
  }
  if (typeof totalAmount !== 'number' || Number.isNaN(totalAmount) || totalAmount < 0) {
    issues.push(`总金额不合法: ${raw.总金额}`);
  }
  if (!Number.isInteger(attendedCount) || attendedCount < 0) {
    issues.push(`已上课次数不合法: ${raw.已上课次数}`);
  }
  if (!Number.isInteger(remainingLessons) || remainingLessons < 0) {
    issues.push(`剩余课时不合法: ${raw.剩余课时}`);
  }

  return {
    lineNo,
    raw,
    record: {
      name,
      gender,
      age,
      course_type: courseType,
      enroll_count: enrollCount,
      total_amount: totalAmount,
      attended_count: attendedCount,
      remaining_lessons: remainingLessons,
      remark: ''
    },
    issues
  };
}

function parseCsv(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV 文件不存在: ${absolutePath}`);
  }

  const rawContent = fs.readFileSync(absolutePath, 'utf8');
  const text = normalizeCsvContent(rawContent);
  if (!text) {
    throw new Error(`CSV 文件为空: ${absolutePath}`);
  }

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV 至少需要表头 + 1 行数据');
  }

  const headers = splitCsvLine(lines[0]);
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      throw new Error(`CSV 缺少必需列: ${required}`);
    }
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const raw = {};
    headers.forEach((header, index) => {
      raw[header] = values[index] || '';
    });

    rows.push(toStudentRecord(raw, i + 1));
  }

  return rows;
}

async function loadExistingKeys() {
  const { query } = getDb();
  const result = await query('SELECT name, course_type FROM students');
  const set = new Set();
  for (const row of result.rows) {
    const key = `${String(row.name).trim().toLowerCase()}|${String(row.course_type).trim().toLowerCase()}`;
    set.add(key);
  }
  return set;
}

function buildKey(record) {
  return `${record.name.trim().toLowerCase()}|${record.course_type.trim().toLowerCase()}`;
}

function printStats(stats) {
  console.log('\n导入结果统计');
  console.log(`- 总行数: ${stats.total}`);
  console.log(`- 校验通过: ${stats.valid}`);
  console.log(`- 校验失败: ${stats.invalid}`);
  console.log(`- 重复跳过: ${stats.duplicate}`);
  console.log(`- 成功导入: ${stats.inserted}`);
  console.log(`- 写入失败: ${stats.failedInsert}`);
}

async function importStudents(options) {
  const { ensureDatabaseConfigured, withTransaction } = getDb();
  ensureDatabaseConfigured();

  const parsedRows = parseCsv(options.file);
  const existingKeys = await loadExistingKeys();
  const batchKeys = new Set();

  const stats = {
    total: parsedRows.length,
    valid: 0,
    invalid: 0,
    duplicate: 0,
    inserted: 0,
    failedInsert: 0
  };

  const validRows = [];

  for (const item of parsedRows) {
    const key = buildKey(item.record);

    if (item.issues.length > 0) {
      stats.invalid += 1;
      console.warn(`[第 ${item.lineNo} 行] 校验失败: ${item.issues.join('；')}`);
      continue;
    }

    if (existingKeys.has(key) || batchKeys.has(key)) {
      stats.duplicate += 1;
      console.warn(`[第 ${item.lineNo} 行] 重复数据，已跳过: ${item.record.name} / ${item.record.course_type}`);
      continue;
    }

    stats.valid += 1;
    batchKeys.add(key);
    validRows.push(item);
  }

  if (options.dryRun) {
    console.log('\n[dry-run] 预演模式：未写入数据库。');
    printStats(stats);
    return;
  }

  await withTransaction(async (client) => {
    for (const item of validRows) {
      try {
        await client.query(
          `INSERT INTO students (
            name, gender, age, course_type, enroll_count, total_amount, attended_count, remaining_lessons, remark
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            item.record.name,
            item.record.gender,
            item.record.age,
            item.record.course_type,
            item.record.enroll_count,
            item.record.total_amount,
            item.record.attended_count,
            item.record.remaining_lessons,
            item.record.remark
          ]
        );
        stats.inserted += 1;
      } catch (error) {
        stats.failedInsert += 1;
        console.error(`[第 ${item.lineNo} 行] 写入失败: ${error.message}`);
      }
    }

    if (stats.failedInsert > 0) {
      throw new Error(`存在 ${stats.failedInsert} 行写入失败，事务已回滚。`);
    }
  });

  printStats(stats);
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    await importStudents(args);
  } catch (error) {
    console.error(`导入失败: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
