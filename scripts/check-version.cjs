#!/usr/bin/env node

/**
 * 版本号一致性校验
 *
 * 检查以下三处版本号是否一致：
 *   1. package.json → version
 *   2. android/app/build.gradle → versionName
 *   3. src/lib/updateChecker.ts → APP_VERSION
 *
 * 用法：
 *   node scripts/check-version.js        # 仅检查
 *   node scripts/check-version.js --fix  # 自动将 android + updateChecker 同步到 package.json 的版本
 *
 * 返回值：
 *   0 = 一致
 *   1 = 不一致
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 1. 读取 package.json
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const pkgVersion = pkg.version;

// 2. 读取 android/app/build.gradle 中的 versionName
const gradlePath = path.join(ROOT, 'android', 'app', 'build.gradle');
const gradleContent = fs.readFileSync(gradlePath, 'utf-8');
const gradleMatch = gradleContent.match(/versionName\s+"([^"]+)"/);
const gradleVersion = gradleMatch ? gradleMatch[1] : null;
const gradleCodeMatch = gradleContent.match(/versionCode\s+(\d+)/);
const gradleVersionCode = gradleCodeMatch ? parseInt(gradleCodeMatch[1], 10) : null;

// 3. 读取 src/lib/updateChecker.ts 中的 APP_VERSION
const checkerPath = path.join(ROOT, 'src', 'lib', 'updateChecker.ts');
const checkerContent = fs.readFileSync(checkerPath, 'utf-8');
const checkerMatch = checkerContent.match(/APP_VERSION\s*=\s*'([^']+)'/);
const checkerVersion = checkerMatch ? checkerMatch[1] : null;

const allMatch = pkgVersion === gradleVersion && pkgVersion === checkerVersion;

if (allMatch) {
  console.log(`✅ 版本号一致: ${pkgVersion}`);
  console.log(`   package.json:            ${pkgVersion}`);
  console.log(`   android/build.gradle:     ${gradleVersion} (versionCode: ${gradleVersionCode})`);
  console.log(`   updateChecker.ts:         ${checkerVersion}`);
  process.exit(0);
}

// 不一致：报告详情
console.log('❌ 版本号不一致！');
console.log(`   package.json:            ${pkgVersion}`);
console.log(`   android/build.gradle:     ${gradleVersion} (versionCode: ${gradleVersionCode})`);
console.log(`   updateChecker.ts:         ${checkerVersion}`);
console.log('');

// --fix 模式：以 package.json 为准自动修复
if (process.argv.includes('--fix')) {
  console.log(`🔧 自动修复中... (以 package.json 版本 ${pkgVersion} 为准)`);

  // 修复 build.gradle
  if (gradleVersion !== pkgVersion) {
    const newCode = gradleVersionCode !== null ? gradleVersionCode + 1 : null;
    let fixed = gradleContent.replace(
      /versionName\s+"[^"]+"/,
      `versionName "${pkgVersion}"`
    );
    if (newCode !== null) {
      fixed = fixed.replace(
        /versionCode\s+\d+/,
        `versionCode ${newCode}`
      );
    }
    fs.writeFileSync(gradlePath, fixed, 'utf-8');
    console.log(`   ✅ android/build.gradle: versionName → "${pkgVersion}", versionCode → ${newCode}`);
  }

  // 修复 updateChecker.ts
  if (checkerVersion !== pkgVersion) {
    const fixed = checkerContent.replace(
      /APP_VERSION\s*=\s*'[^']+'/,
      `APP_VERSION = '${pkgVersion}'`
    );
    fs.writeFileSync(checkerPath, fixed, 'utf-8');
    console.log(`   ✅ updateChecker.ts: APP_VERSION → '${pkgVersion}'`);
  }

  console.log('✅ 修复完成，版本号已同步');
  process.exit(0);
}

// 无 --fix，给出修复建议
console.log('💡 请手动同步版本号，或执行:');
console.log(`   node scripts/check-version.js --fix`);
console.log('');
console.log('   需要更新的位置:');
if (gradleVersion !== pkgVersion) {
  console.log(`   - android/app/build.gradle   versionName "${gradleVersion}" → "${pkgVersion}"`);
  console.log(`                                  versionCode ${gradleVersionCode} → ${gradleVersionCode !== null ? gradleVersionCode + 1 : '?'}`);
}
if (checkerVersion !== pkgVersion) {
  console.log(`   - src/lib/updateChecker.ts    APP_VERSION = '${checkerVersion}' → '${pkgVersion}'`);
}
process.exit(1);