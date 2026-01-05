/**
 * Password Hash Generator
 * 
 * Script untuk generate password hash yang akan digunakan di Google Sheets
 * 
 * Usage:
 * node scripts/generatePasswordHash.js
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('='.repeat(50));
console.log('Password Hash Generator');
console.log('='.repeat(50));
console.log('');

rl.question('Enter password to hash: ', (password) => {
  if (!password) {
    console.log('❌ Password cannot be empty!');
    rl.close();
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  
  console.log('');
  console.log('✅ Password hashed successfully!');
  console.log('');
  console.log('Copy this hash to Google Sheets:');
  console.log('-'.repeat(50));
  console.log(hash);
  console.log('-'.repeat(50));
  console.log('');
  console.log('Example Google Sheets entry:');
  console.log('| id | username | password | role | name |');
  console.log(`| 1  | admin    | ${hash} | super_admin | Administrator |`);
  console.log('');
  
  rl.close();
});
